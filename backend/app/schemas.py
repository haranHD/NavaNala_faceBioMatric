from pydantic import BaseModel

class EmployeeCreate(BaseModel):
    name: str
    department: str
    role: str