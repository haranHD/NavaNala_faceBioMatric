"""Monthly permission quota: 2 hours 30 minutes (150 minutes) per employee."""

from calendar import monthrange
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app import models

MONTHLY_PERMISSION_LIMIT_MINUTES = 150  # 2h 30m


def _month_bounds(d: date) -> tuple:
    start = date(d.year, d.month, 1)
    last_day = monthrange(d.year, d.month)[1]
    end = date(d.year, d.month, last_day)
    return start, end


def get_used_permission_minutes(db: Session, employee_id: int, for_date: date) -> int:
    start, end = _month_bounds(for_date)
    rows = (
        db.query(models.Permission)
        .filter(
            models.Permission.employee_id == employee_id,
            models.Permission.status == "approved",
            models.Permission.permission_date >= start,
            models.Permission.permission_date <= end,
        )
        .all()
    )
    return sum(r.duration_minutes or 0 for r in rows)


def get_permission_balance(db: Session, employee_id: int, for_date: Optional[date] = None) -> Dict[str, Any]:
    d = for_date or date.today()
    used = get_used_permission_minutes(db, employee_id, d)
    remaining = max(MONTHLY_PERMISSION_LIMIT_MINUTES - used, 0)
    return {
        "monthly_limit_minutes": MONTHLY_PERMISSION_LIMIT_MINUTES,
        "used_minutes": used,
        "remaining_minutes": remaining,
        "used_display": _mins_to_hm(used),
        "remaining_display": _mins_to_hm(remaining),
        "limit_display": _mins_to_hm(MONTHLY_PERMISSION_LIMIT_MINUTES),
    }


def _mins_to_hm(mins: int) -> str:
    h, m = divmod(mins, 60)
    return f"{h}h {m}m"


def has_approved_permission_for_date(
    db: Session, employee_id: int, on_date: date, min_minutes: int = 1
) -> Optional[models.Permission]:
    row = (
        db.query(models.Permission)
        .filter(
            models.Permission.employee_id == employee_id,
            models.Permission.permission_date == on_date,
            models.Permission.status == "approved",
            models.Permission.duration_minutes >= min_minutes,
        )
        .order_by(models.Permission.duration_minutes.desc())
        .first()
    )
    return row


def try_waive_violation(
    db: Session,
    employee_id: int,
    on_date: date,
    violation_minutes: int,
) -> bool:
    """If approved permission covers violation duration, return True."""
    if violation_minutes <= 0:
        return False
    perm = has_approved_permission_for_date(db, employee_id, on_date, violation_minutes)
    return perm is not None


def create_permission_request(
    db: Session,
    employee_id: int,
    permission_date: date,
    from_time: str,
    to_time: str,
    reason: str,
) -> models.Permission:
    emp = db.query(models.Employee).filter(models.Employee.employee_id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    from_time = from_time.strip()[:5]
    to_time = to_time.strip()[:5]
    try:
        ft = datetime.strptime(from_time, "%H:%M").time()
        tt = datetime.strptime(to_time, "%H:%M").time()
    except ValueError:
        raise HTTPException(status_code=400, detail="Times must be HH:MM format")

    start = datetime.combine(permission_date, ft)
    end = datetime.combine(permission_date, tt)
    if end <= start:
        raise HTTPException(status_code=400, detail="to_time must be after from_time")

    duration = int((end - start).total_seconds() / 60)
    balance = get_permission_balance(db, employee_id, permission_date)
    if duration > balance["remaining_minutes"]:
        raise HTTPException(
            status_code=400,
            detail=f"Requested {duration} min exceeds remaining permission ({balance['remaining_display']})",
        )

    perm = models.Permission(
        employee_id=employee_id,
        permission_date=permission_date,
        from_time=from_time,
        to_time=to_time,
        duration_minutes=duration,
        reason=reason,
        status="pending",
    )
    db.add(perm)
    db.commit()
    db.refresh(perm)
    return perm


def review_permission(
    db: Session, permission_id: int, approve: bool
) -> models.Permission:
    perm = db.query(models.Permission).filter(models.Permission.permission_id == permission_id).first()
    if not perm:
        raise HTTPException(status_code=404, detail="Permission request not found")
    if perm.status != "pending":
        raise HTTPException(status_code=400, detail="Permission already reviewed")

    if approve:
        balance = get_permission_balance(db, perm.employee_id, perm.permission_date)
        if perm.duration_minutes > balance["remaining_minutes"]:
            raise HTTPException(status_code=400, detail="Insufficient remaining permission balance")
        perm.status = "approved"
    else:
        perm.status = "rejected"

    db.commit()
    db.refresh(perm)
    return perm


def list_permissions(
    db: Session,
    employee_id: Optional[int] = None,
    status: Optional[str] = None,
) -> List[models.Permission]:
    q = db.query(models.Permission)
    if employee_id:
        q = q.filter(models.Permission.employee_id == employee_id)
    if status and status != "All":
        q = q.filter(models.Permission.status == status)
    return q.order_by(models.Permission.permission_date.desc()).all()
