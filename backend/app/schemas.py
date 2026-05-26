from pydantic import BaseModel
from typing import List, Optional

class EmployeeCreate(BaseModel):
    name: str
    department: str
    role: str
    gender: str
    employee_code: Optional[str] = None
    auto_generate_code: bool = True

class EmployeeCodePreview(BaseModel):
    employee_code: str
    year: int

class EmployeeResponse(BaseModel):
    employee_id: int
    employee_code: Optional[str] = None
    name: str
    department: str
    role: str
    gender: Optional[str] = None
    is_registered: bool = False
    encoding_count: int = 0

    class Config:
        from_attributes = True

class AttendanceCreate(BaseModel):
    employee_id: int
    status: str = "Present"
    confidence: Optional[float] = None
    event_type: Optional[str] = None

class AttendanceResponse(BaseModel):
    attendance_id: int
    employee_id: int
    employee_code: Optional[str] = None
    employee_name: Optional[str] = None
    department: Optional[str] = None
    gender: Optional[str] = None
    attendance_date: Optional[str] = None
    status: str
    attendance_status: Optional[str] = None
    confidence: Optional[float] = None
    check_in: Optional[str] = None
    check_in_time: Optional[str] = None
    lunch_out_time: Optional[str] = None
    lunch_in_time: Optional[str] = None
    check_out: Optional[str] = None
    check_out_time: Optional[str] = None
    late_status: bool = False
    lunch_exceeded_status: bool = False
    lunch_exceeded_minutes: float = 0
    early_checkout_status: bool = False
    early_checkout_reason: Optional[str] = None
    working_hours: float = 0
    overtime_hours: float = 0
    permission_used_minutes: int = 0
    next_expected_event: Optional[str] = None
    event_type: Optional[str] = None
    message: Optional[str] = None
    warnings: List[str] = []

class AttendanceSummary(BaseModel):
    total_employees: int
    present_today: int
    absent_today: int
    late_entry: int
    lunch_exceeded: int
    early_checkout: int
    on_permission: int
    avg_working_hours: float

class PermissionCreate(BaseModel):
    employee_id: int
    permission_date: str
    from_time: str
    to_time: str
    reason: str

class PermissionReview(BaseModel):
    approve: bool

class PermissionResponse(BaseModel):
    permission_id: int
    employee_id: int
    permission_date: str
    from_time: str
    to_time: str
    duration_minutes: int
    reason: Optional[str] = None
    status: str

    class Config:
        from_attributes = True

class FaceRegistrationRequest(BaseModel):
    employee_id: str
    images: List[str]

class FaceRecognitionRequest(BaseModel):
    image: str
