"""Mark employees absent when no morning check-in by end of day."""

from datetime import date
from typing import Dict

from sqlalchemy.orm import Session

from app import models


def mark_absents_for_date(db: Session, target_date: date) -> Dict[str, int]:
    """
    For each employee without check_in_time on target_date, ensure an Absent record exists.
    Does not overwrite employees who already checked in.
    """
    employees = db.query(models.Employee).all()
    marked = 0
    skipped = 0

    for emp in employees:
        record = (
            db.query(models.Attendance)
            .filter(
                models.Attendance.employee_id == emp.employee_id,
                models.Attendance.attendance_date == target_date,
            )
            .first()
        )
        if record and record.check_in_time:
            skipped += 1
            continue

        if not record:
            record = models.Attendance(
                employee_id=emp.employee_id,
                attendance_date=target_date,
                status="Absent",
                attendance_status="Absent",
            )
            db.add(record)
            marked += 1
        elif not record.check_in_time and record.status != "Absent":
            record.status = "Absent"
            record.attendance_status = "Absent"
            marked += 1

    db.commit()
    return {"marked_absent": marked, "already_present": skipped, "date": str(target_date)}
