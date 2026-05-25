from pydantic import BaseModel
from typing import List, Optional

class EmployeeCreate(BaseModel):
    name: str
    department: str
    role: str

class EmployeeResponse(BaseModel):
    employee_id: int
    name: str
    department: str
    role: str
    
    is_registered: bool = False
    encoding_count: int = 0

    class Config:
        from_attributes = True

class AttendanceCreate(BaseModel):
    employee_id: int
    status: str = "Present"
    confidence: Optional[float] = None

class AttendanceResponse(BaseModel):
    attendance_id: int
    employee_id: int
    status: str
    confidence: Optional[float] = None
    check_in: str

    class Config:
        from_attributes = True

class FaceRegistrationRequest(BaseModel):
    employee_id: str
    images: List[str]  # Base64 strings

class FaceRecognitionRequest(BaseModel):
    image: str  # Base64 string