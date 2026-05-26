"""Attendance biometric event processing — strict CHECK-IN → LUNCH OUT → LUNCH IN → CHECK-OUT."""

from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app import models
from app.attendance_rules import (
    EVENT_CHECK_IN,
    EVENT_CHECK_OUT,
    EVENT_LUNCH_IN,
    EVENT_LUNCH_OUT,
    EVENT_LABELS,
    calculate_overtime_hours,
    calculate_working_hours,
    evaluate_checkout,
    evaluate_lunch_in,
    evaluate_morning_check_in,
    is_lunch_window,
    now_local,
    today_local,
    to_local,
)
from app.permission_service import try_waive_violation


def _sync_legacy_check_in(record: models.Attendance) -> None:
    if record.check_in_time and not record.check_in:
        record.check_in = record.check_in_time


def _sync_legacy_check_out(record: models.Attendance) -> None:
    if record.check_out_time and not record.check_out:
        record.check_out = record.check_out_time


def get_today_record(db: Session, employee_id: int) -> Optional[models.Attendance]:
    return (
        db.query(models.Attendance)
        .filter(
            models.Attendance.employee_id == employee_id,
            models.Attendance.attendance_date == today_local(),
        )
        .first()
    )


def get_or_create_today(db: Session, employee_id: int) -> models.Attendance:
    record = get_today_record(db, employee_id)
    if record:
        return record
    record = models.Attendance(
        employee_id=employee_id,
        attendance_date=today_local(),
        status="Pending",
        attendance_status="Pending",
    )
    db.add(record)
    db.flush()
    return record


def infer_next_event(record: models.Attendance) -> Optional[str]:
    """
    Strict sequence — never skip to checkout after only check-in.
    1. check_in → 2. lunch_out → 3. lunch_in → 4. check_out
    """
    if record.check_out_time:
        return None

    if not record.check_in_time:
        return EVENT_CHECK_IN

    if not record.lunch_out_time:
        return EVENT_LUNCH_OUT

    if not record.lunch_in_time:
        return EVENT_LUNCH_IN

    if not record.check_out_time:
        return EVENT_CHECK_OUT

    return None


def next_event_hint(record: models.Attendance) -> str:
    nxt = infer_next_event(record)
    if nxt:
        return EVENT_LABELS.get(nxt, nxt)
    return "Attendance complete for today"


def _finalize_status(record: models.Attendance, permission_waived: bool) -> None:
    if permission_waived:
        record.status = "Permission Approved"
        record.attendance_status = "Permission Approved"
        return
    if record.lunch_exceeded_status:
        record.status = "Lunch Break Exceeded"
        record.attendance_status = "Lunch Break Exceeded"
    elif record.early_checkout_status:
        record.status = "Early Checkout"
        record.attendance_status = "Early Checkout"
    elif record.late_status:
        record.status = "Late Entry"
        record.attendance_status = "Late Entry"
    elif record.check_out_time:
        record.status = "Present"
        record.attendance_status = "Present"
    elif record.check_in_time:
        record.status = "In Progress"
        record.attendance_status = "In Progress"


def attendance_to_dict(
    record: models.Attendance, employee: Optional[models.Employee] = None
) -> Dict[str, Any]:
    def iso(dt: Optional[datetime]) -> Optional[str]:
        if not dt:
            return None
        return to_local(dt).isoformat()

    return {
        "attendance_id": record.attendance_id,
        "employee_id": record.employee_id,
        "employee_code": employee.employee_code if employee else None,
        "employee_name": employee.name if employee else None,
        "department": employee.department if employee else None,
        "gender": employee.gender if employee else None,
        "attendance_date": str(record.attendance_date) if record.attendance_date else None,
        "check_in": iso(record.check_in_time or record.check_in),
        "check_in_time": iso(record.check_in_time),
        "lunch_out_time": iso(record.lunch_out_time),
        "lunch_in_time": iso(record.lunch_in_time),
        "check_out": iso(record.check_out_time or record.check_out),
        "check_out_time": iso(record.check_out_time),
        "status": record.status,
        "attendance_status": record.attendance_status or record.status,
        "late_status": bool(record.late_status),
        "lunch_exceeded_status": bool(record.lunch_exceeded_status),
        "lunch_exceeded_minutes": record.lunch_exceeded_minutes or 0,
        "early_checkout_status": bool(record.early_checkout_status),
        "early_checkout_reason": record.early_checkout_reason,
        "working_hours": record.working_hours or 0,
        "overtime_hours": record.overtime_hours or 0,
        "permission_used_minutes": record.permission_used_minutes or 0,
        "next_expected_event": next_event_hint(record),
    }


def process_biometric(
    db: Session,
    employee_id: int,
    confidence: Optional[float] = None,
    event_type: Optional[str] = None,
) -> Dict[str, Any]:
    employee = (
        db.query(models.Employee)
        .filter(models.Employee.employee_id == employee_id)
        .first()
    )
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if not employee.gender:
        raise HTTPException(
            status_code=400,
            detail="Employee gender is required. Update the employee profile.",
        )

    now = now_local()
    record = get_or_create_today(db, employee_id)
    expected = infer_next_event(record)

    if expected is None:
        raise HTTPException(
            status_code=400,
            detail="Attendance already completed for today",
        )

    event = event_type or expected

    # Prevent skipping steps (e.g. jumping to checkout after check-in only)
    if event != expected:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid scan order. Next required step: {EVENT_LABELS.get(expected, expected)}. "
                f"You cannot perform '{EVENT_LABELS.get(event, event)}' yet."
            ),
        )

    warnings: list = []
    message = ""
    permission_waived = False
    on_date = record.attendance_date or today_local()

    if event == EVENT_CHECK_IN:
        if record.check_in_time:
            raise HTTPException(status_code=400, detail="Morning check-in already recorded today.")
        record.check_in_time = now.replace(tzinfo=None)
        _sync_legacy_check_in(record)
        status, late, late_mins = evaluate_morning_check_in(now)
        record.late_status = late
        if late and try_waive_violation(db, employee_id, on_date, late_mins):
            permission_waived = True
            record.permission_used_minutes = late_mins
        elif late:
            warnings.append("Late Entry — checked in after 9:15 AM")
        message = "Morning check-in recorded"
        record.status = "In Progress"
        record.attendance_status = "In Progress"

    elif event == EVENT_LUNCH_OUT:
        if not record.check_in_time:
            raise HTTPException(status_code=400, detail="Complete morning check-in first.")
        if record.lunch_out_time:
            raise HTTPException(status_code=400, detail="Lunch check-out already recorded.")
        if not is_lunch_window(now):
            raise HTTPException(
                status_code=400,
                detail="Lunch check-out is only allowed between 1:00 PM and 1:30 PM.",
            )
        record.lunch_out_time = now.replace(tzinfo=None)
        message = "Lunch check-out recorded"

    elif event == EVENT_LUNCH_IN:
        if not record.lunch_out_time:
            raise HTTPException(status_code=400, detail="Lunch check-out must be recorded first.")
        if record.lunch_in_time:
            raise HTTPException(status_code=400, detail="Lunch check-in already recorded.")
        record.lunch_in_time = now.replace(tzinfo=None)
        exceeded, mins = evaluate_lunch_in(record.lunch_out_time, now)
        record.lunch_exceeded_status = exceeded
        record.lunch_exceeded_minutes = mins if exceeded else None
        message = "Lunch check-in recorded"
        if exceeded:
            warnings.append(f"Lunch Break Exceeded by {mins} minutes")

    elif event == EVENT_CHECK_OUT:
        if not record.check_in_time:
            raise HTTPException(status_code=400, detail="Morning check-in required before checkout.")
        if not record.lunch_out_time or not record.lunch_in_time:
            raise HTTPException(
                status_code=400,
                detail="Complete lunch check-out and lunch check-in before EOD checkout.",
            )
        if record.check_out_time:
            raise HTTPException(status_code=400, detail="EOD checkout already recorded.")
        early, reason, early_mins = evaluate_checkout(employee.gender, now)
        record.check_out_time = now.replace(tzinfo=None)
        _sync_legacy_check_out(record)
        record.early_checkout_status = early
        record.early_checkout_reason = reason if early else None
        if early and try_waive_violation(db, employee_id, on_date, early_mins):
            permission_waived = True
            record.permission_used_minutes = (record.permission_used_minutes or 0) + early_mins
        elif early:
            warnings.append(reason)
        record.working_hours = calculate_working_hours(
            record.check_in_time,
            record.lunch_out_time,
            record.lunch_in_time,
            record.check_out_time,
        )
        record.overtime_hours = calculate_overtime_hours(record.working_hours)
        message = "EOD checkout recorded"
        _finalize_status(record, permission_waived)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown event type: {event}")

    if event != EVENT_CHECK_OUT:
        _finalize_status(record, permission_waived)

    if confidence is not None:
        record.confidence = confidence

    db.commit()
    db.refresh(record)

    result = attendance_to_dict(record, employee)
    result["event_type"] = event
    result["message"] = message
    result["warnings"] = warnings
    result["next_expected_event"] = next_event_hint(record)
    return result
