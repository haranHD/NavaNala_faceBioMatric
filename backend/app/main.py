from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.schemas import EmployeeCreate, EmployeeResponse
from app.database import SessionLocal, engine, Base
from app import models, schemas
from fastapi import Depends


Base.metadata.create_all(bind=engine)

app = FastAPI()

# DB Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ➕ CREATE EMPLOYEE
@app.post("/employees", response_model=schemas.EmployeeResponse)
def create_employee(employee: schemas.EmployeeCreate, db: Session = Depends(get_db)):
    new_emp = models.Employee(**employee.dict())
    db.add(new_emp)
    db.commit()
    db.refresh(new_emp)
    return new_emp


# 📄 GET ALL EMPLOYEES
@app.get("/employees", response_model=List[schemas.EmployeeResponse])
def get_employees(db: Session = Depends(get_db)):
    return db.query(models.Employee).all()


# 🔍 GET EMPLOYEE BY ID
@app.get("/employees/{employee_id}", response_model=schemas.EmployeeResponse)
def get_employee(employee_id: int, db: Session = Depends(get_db)):
    emp = db.query(models.Employee).filter(models.Employee.employee_id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp


# ✏️ UPDATE EMPLOYEE
@app.put("/employees/{employee_id}", response_model=schemas.EmployeeResponse)
def update_employee(employee_id: int, updated: schemas.EmployeeCreate, db: Session = Depends(get_db)):
    emp = db.query(models.Employee).filter(models.Employee.employee_id == employee_id).first()

    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    emp.name = updated.name
    emp.department = updated.department
    emp.role = updated.role

    db.commit()
    db.refresh(emp)
    return emp


# ❌ DELETE EMPLOYEE
@app.delete("/employees/{employee_id}")
def delete_employee(employee_id: int, db: Session = Depends(get_db)):
    emp = db.query(models.Employee).filter(models.Employee.employee_id == employee_id).first()

    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    db.delete(emp)
    db.commit()

    return {"message": "Employee deleted successfully"}


# ATTENDANCE API
@app.post("/attendance")
def mark_attendance(att: schemas.AttendanceCreate, db: Session = Depends(get_db)):
    record = models.Attendance(
        employee_id=att.employee_id,
        status=att.status
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "message": "Attendance marked",
        "employee_id": att.employee_id
    }