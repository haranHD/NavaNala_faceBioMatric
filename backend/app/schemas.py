from pydantic import BaseModel

class EmployeeCreate(BaseModel):
    name: str
    department: str
    role: str


class EmployeeResponse(BaseModel):
    employee_id: int
    name: str
    department: str
    role: str

    class Config:
        from_attributes = True


class AttendanceCreate(BaseModel):
    employee_id: int
    status: str = "Present"