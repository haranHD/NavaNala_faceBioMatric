"""Employee code helpers — format: 0001-2026 (sequence + calendar year)."""

import re
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models import Employee

CODE_PATTERN = re.compile(r"^(\d{4})-(\d{4})$")


def normalize_employee_code(raw: str) -> str:
    cleaned = raw.strip().upper()
    match = CODE_PATTERN.match(cleaned)
    if not match:
        raise ValueError(
            "Employee ID must be in format 0001-2026 (4-digit sequence, hyphen, 4-digit year)"
        )
    seq, year = match.groups()
    return f"{seq}-{year}"


def generate_next_employee_code(db: Session, year: Optional[int] = None) -> str:
    year = year or datetime.utcnow().year
    year_str = str(year)

    rows = (
        db.query(Employee.employee_code)
        .filter(Employee.employee_code.isnot(None))
        .filter(Employee.employee_code.like(f"%-{year_str}"))
        .all()
    )

    max_seq = 0
    for (code,) in rows:
        if not code:
            continue
        match = CODE_PATTERN.match(code)
        if match and match.group(2) == year_str:
            max_seq = max(max_seq, int(match.group(1)))

    return f"{max_seq + 1:04d}-{year_str}"


def ensure_unique_code(db: Session, code: str, exclude_employee_id: Optional[int] = None) -> None:
    query = db.query(Employee).filter(Employee.employee_code == code)
    if exclude_employee_id is not None:
        query = query.filter(Employee.employee_id != exclude_employee_id)
    if query.first():
        raise ValueError(f"Employee ID '{code}' is already assigned")
