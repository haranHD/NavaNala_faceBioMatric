"""Attendance timing rules (Asia/Kolkata)."""

from datetime import datetime, time, timedelta, timezone
from typing import Optional, Tuple

# Asia/Kolkata (UTC+5:30)
TZ = timezone(timedelta(hours=5, minutes=30))

MORNING_START = time(9, 0)
MORNING_END = time(9, 15)
LUNCH_START = time(13, 0)
LUNCH_END = time(13, 30)
LUNCH_MAX_GAP = timedelta(minutes=45)
CHECKOUT_MALE = time(18, 45)
CHECKOUT_FEMALE = time(18, 0)
STANDARD_WORK_HOURS = 8.0

# Strict biometric sequence (do not skip steps)
EVENT_CHECK_IN = "check_in"
EVENT_LUNCH_OUT = "lunch_out"
EVENT_LUNCH_IN = "lunch_in"
EVENT_CHECK_OUT = "check_out"

EVENT_LABELS = {
    EVENT_CHECK_IN: "Check-In (Morning)",
    EVENT_LUNCH_OUT: "Lunch Check-Out",
    EVENT_LUNCH_IN: "Lunch Check-In",
    EVENT_CHECK_OUT: "Check-Out (EOD)",
}


def now_local() -> datetime:
    return datetime.now(TZ)


def today_local():
    return now_local().date()


def to_local(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=TZ)
    return dt.astimezone(TZ)


def evaluate_morning_check_in(when: datetime) -> Tuple[str, bool, int]:
    """Returns (status_label, is_late, late_minutes)."""
    t = to_local(when).time()
    if t > MORNING_END:
        late_mins = (
            datetime.combine(today_local(), t) - datetime.combine(today_local(), MORNING_END)
        ).seconds // 60
        return "Late Entry", True, int(late_mins)
    return "Present", False, 0


def is_lunch_window(when: datetime) -> bool:
    t = to_local(when).time()
    return LUNCH_START <= t <= LUNCH_END


def evaluate_lunch_in(lunch_out: datetime, lunch_in: datetime) -> Tuple[bool, float]:
    gap = to_local(lunch_in) - to_local(lunch_out)
    if gap > LUNCH_MAX_GAP:
        exceeded_mins = (gap - LUNCH_MAX_GAP).total_seconds() / 60.0
        return True, round(exceeded_mins, 1)
    return False, 0.0


def min_checkout_time(gender: Optional[str]) -> time:
    g = (gender or "").strip().lower()
    if g == "female":
        return CHECKOUT_FEMALE
    return CHECKOUT_MALE


def evaluate_checkout(gender: Optional[str], when: datetime) -> Tuple[bool, str, int]:
    """Returns (is_early, message, early_minutes)."""
    t = to_local(when).time()
    required = min_checkout_time(gender)
    if t < required:
        early_mins = (
            datetime.combine(today_local(), required) - datetime.combine(today_local(), t)
        ).seconds // 60
        label = "Male" if required == CHECKOUT_MALE else "Female"
        return (
            True,
            f"Early Checkout ({label} allowed after {required.strftime('%I:%M %p')})",
            int(early_mins),
        )
    return False, "Checked Out", 0


def calculate_working_hours(
    check_in: Optional[datetime],
    lunch_out: Optional[datetime],
    lunch_in: Optional[datetime],
    check_out: Optional[datetime],
) -> float:
    if not check_in or not check_out:
        return 0.0
    start = to_local(check_in)
    end = to_local(check_out)
    total = end - start
    if lunch_out and lunch_in:
        total -= to_local(lunch_in) - to_local(lunch_out)
    return round(max(total.total_seconds() / 3600.0, 0.0), 2)


def calculate_overtime_hours(working_hours: float) -> float:
    if working_hours <= STANDARD_WORK_HOURS:
        return 0.0
    return round(working_hours - STANDARD_WORK_HOURS, 2)
