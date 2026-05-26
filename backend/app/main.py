import os
import base64
import csv
import io
import numpy as np
import cv2
from datetime import datetime, timedelta, date
from typing import List, Dict, Optional

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.database import SessionLocal, engine, Base
from app import models, schemas
from app.face_engine import extract_face_encoding_from_bgr, find_best_match, normalize_encoding
from app.employee_code import (
    generate_next_employee_code,
    normalize_employee_code,
    ensure_unique_code,
)
from app.migrations import run_migrations
from app.attendance_service import (
    process_biometric,
    attendance_to_dict,
    get_today_record,
)
from app.attendance_rules import today_local
from app.absent_service import mark_absents_for_date
from app.permission_service import (
    create_permission_request,
    get_permission_balance,
    list_permissions,
    review_permission,
)

# We recreate the DB schema if needed
Base.metadata.create_all(bind=engine)
run_migrations()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# In-memory queue for multi-frame validation
recent_matches: Dict[int, List[datetime]] = {}
MATCH_THRESHOLD = 2  # consecutive positive frames before confirming
TIME_WINDOW = timedelta(seconds=4)

MIN_REGISTRATION_FACES = 3

def decode_base64_image(base64_string):
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]
    image_data = base64.b64decode(base64_string)
    nparr = np.frombuffer(image_data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

# 🔢 PREVIEW NEXT EMPLOYEE CODE (e.g. 0005-2026)
@app.get("/employees/next-code", response_model=schemas.EmployeeCodePreview)
def preview_next_employee_code(db: Session = Depends(get_db)):
    year = datetime.utcnow().year
    code = generate_next_employee_code(db, year=year)
    return {"employee_code": code, "year": year}


# ➕ CREATE EMPLOYEE
@app.post("/employees", response_model=schemas.EmployeeResponse)
def create_employee(employee: schemas.EmployeeCreate, db: Session = Depends(get_db)):
    try:
        if employee.auto_generate_code or not (employee.employee_code or "").strip():
            code = generate_next_employee_code(db)
        else:
            code = normalize_employee_code(employee.employee_code)
            ensure_unique_code(db, code)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    gender = (employee.gender or "").strip()
    if gender not in ("Male", "Female"):
        raise HTTPException(status_code=400, detail="Gender must be Male or Female")

    new_emp = models.Employee(
        employee_code=code,
        name=employee.name,
        department=employee.department,
        role=employee.role,
        gender=gender,
    )
    db.add(new_emp)
    db.commit()
    db.refresh(new_emp)
    return get_employee(new_emp.employee_id, db)

# 📄 GET ALL EMPLOYEES
@app.get("/employees", response_model=List[schemas.EmployeeResponse])
def get_employees(db: Session = Depends(get_db)):
    employees = db.query(models.Employee).all()
    # Eagerly count encodings
    result = []
    for emp in employees:
        count = db.query(models.FaceEncoding).filter(models.FaceEncoding.employee_id == emp.employee_id).count()
        setattr(emp, 'is_registered', count > 0)
        setattr(emp, 'encoding_count', count)
        result.append(emp)
    return result

# 🔍 GET EMPLOYEE BY ID
@app.get("/employees/{employee_id}", response_model=schemas.EmployeeResponse)
def get_employee(employee_id: int, db: Session = Depends(get_db)):
    emp = db.query(models.Employee).filter(models.Employee.employee_id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    count = db.query(models.FaceEncoding).filter(models.FaceEncoding.employee_id == emp.employee_id).count()
    setattr(emp, 'is_registered', count > 0)
    setattr(emp, 'encoding_count', count)
    return emp

# ✏️ UPDATE EMPLOYEE
@app.put("/employees/{employee_id}", response_model=schemas.EmployeeResponse)
def update_employee(employee_id: int, updated: schemas.EmployeeCreate, db: Session = Depends(get_db)):
    emp = db.query(models.Employee).filter(models.Employee.employee_id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    gender = (updated.gender or "").strip()
    if gender not in ("Male", "Female"):
        raise HTTPException(status_code=400, detail="Gender must be Male or Female")

    emp.name = updated.name
    emp.department = updated.department
    emp.role = updated.role
    emp.gender = gender

    if (updated.employee_code or "").strip():
        try:
            code = normalize_employee_code(updated.employee_code)
            ensure_unique_code(db, code, exclude_employee_id=employee_id)
            emp.employee_code = code
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    db.commit()
    db.refresh(emp)
    return get_employee(employee_id, db)

# ❌ DELETE EMPLOYEE (Cascades to Encodings and Attendance)
@app.delete("/employees/{employee_id}")
def delete_employee(employee_id: int, db: Session = Depends(get_db)):
    emp = db.query(models.Employee).filter(models.Employee.employee_id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    db.delete(emp)
    db.commit()
    return {"message": "Employee deleted successfully (cascaded)"}

# ❌ RESET FACE DATA ONLY
@app.delete("/employees/{employee_id}/face-data")
def delete_employee_face_data(employee_id: int, db: Session = Depends(get_db)):
    db.query(models.FaceEncoding).filter(models.FaceEncoding.employee_id == employee_id).delete()
    db.commit()
    return {"message": "Face encodings deleted successfully for employee"}

def _attendance_query(
    db: Session,
    att_date: Optional[date] = None,
    employee_id: Optional[int] = None,
    department: Optional[str] = None,
    gender: Optional[str] = None,
    status: Optional[str] = None,
):
    q = db.query(models.Attendance).join(models.Employee)
    if att_date:
        q = q.filter(models.Attendance.attendance_date == att_date)
    if employee_id:
        q = q.filter(models.Attendance.employee_id == employee_id)
    if department and department != "All":
        q = q.filter(models.Employee.department == department)
    if gender and gender != "All":
        q = q.filter(models.Employee.gender == gender)
    if status and status != "All":
        q = q.filter(models.Attendance.status == status)
    return (
        q.options(joinedload(models.Attendance.employee))
        .order_by(models.Attendance.attendance_date.desc(), models.Attendance.check_in_time.desc())
    )


# 🗓️ GET ATTENDANCE
@app.get("/attendance", response_model=List[schemas.AttendanceResponse])
def get_attendance(
    db: Session = Depends(get_db),
    att_date: Optional[str] = Query(None, alias="date"),
    employee_id: Optional[int] = None,
    department: Optional[str] = None,
    gender: Optional[str] = None,
    status: Optional[str] = Query(None),
):
    parsed_date = date.fromisoformat(att_date) if att_date else None
    records = _attendance_query(
        db, parsed_date, employee_id, department, gender, status
    ).all()
    result = []
    for r in records:
        result.append(attendance_to_dict(r, r.employee))
    return result


# 📊 ATTENDANCE SUMMARY
@app.get("/attendance/summary", response_model=schemas.AttendanceSummary)
def attendance_summary(
    db: Session = Depends(get_db),
    att_date: Optional[str] = Query(None, alias="date"),
    employee_id: Optional[int] = None,
    department: Optional[str] = None,
    gender: Optional[str] = None,
    status: Optional[str] = None,
):
    target = date.fromisoformat(att_date) if att_date else today_local()
    total_employees = db.query(models.Employee).count()
    records = _attendance_query(
        db, target, employee_id, department, gender, status
    ).all()
    checked_in = [r for r in records if r.check_in_time]
    hours = [r.working_hours for r in records if r.working_hours]
    absent = len([r for r in records if r.status == "Absent" or (not r.check_in_time and r.status == "Absent")])
    if not records:
        absent = total_employees
    return {
        "total_employees": total_employees,
        "present_today": len([r for r in records if r.status == "Present"]),
        "absent_today": absent,
        "late_entry": len([r for r in records if r.late_status and r.status != "Permission Approved"]),
        "lunch_exceeded": len([r for r in records if r.lunch_exceeded_status]),
        "early_checkout": len([r for r in records if r.early_checkout_status and r.status != "Permission Approved"]),
        "on_permission": len([r for r in records if r.status == "Permission Approved"]),
        "avg_working_hours": round(sum(hours) / len(hours), 2) if hours else 0.0,
    }


# 🌙 END OF DAY — mark absent (cron-friendly)
@app.post("/attendance/close-day")
def close_attendance_day(
    att_date: Optional[str] = Query(None, alias="date"),
    db: Session = Depends(get_db),
):
    target = date.fromisoformat(att_date) if att_date else today_local()
    return mark_absents_for_date(db, target)


# 📝 PERMISSIONS
@app.get("/permissions/balance/{employee_id}")
def permission_balance(employee_id: int, db: Session = Depends(get_db)):
    return get_permission_balance(db, employee_id)


@app.get("/permissions", response_model=List[schemas.PermissionResponse])
def get_permissions(
    employee_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    rows = list_permissions(db, employee_id, status)
    return [
        {
            "permission_id": p.permission_id,
            "employee_id": p.employee_id,
            "permission_date": str(p.permission_date),
            "from_time": p.from_time,
            "to_time": p.to_time,
            "duration_minutes": p.duration_minutes,
            "reason": p.reason,
            "status": p.status,
        }
        for p in rows
    ]


@app.post("/permissions", response_model=schemas.PermissionResponse)
def request_permission(body: schemas.PermissionCreate, db: Session = Depends(get_db)):
    p = create_permission_request(
        db,
        body.employee_id,
        date.fromisoformat(body.permission_date),
        body.from_time,
        body.to_time,
        body.reason,
    )
    return {
        "permission_id": p.permission_id,
        "employee_id": p.employee_id,
        "permission_date": str(p.permission_date),
        "from_time": p.from_time,
        "to_time": p.to_time,
        "duration_minutes": p.duration_minutes,
        "reason": p.reason,
        "status": p.status,
    }


@app.patch("/permissions/{permission_id}/review", response_model=schemas.PermissionResponse)
def approve_permission(
    permission_id: int,
    body: schemas.PermissionReview,
    db: Session = Depends(get_db),
):
    p = review_permission(db, permission_id, body.approve)
    return {
        "permission_id": p.permission_id,
        "employee_id": p.employee_id,
        "permission_date": str(p.permission_date),
        "from_time": p.from_time,
        "to_time": p.to_time,
        "duration_minutes": p.duration_minutes,
        "reason": p.reason,
        "status": p.status,
    }


# 📥 EXPORT CSV
@app.get("/attendance/export/csv")
def export_attendance_csv(
    db: Session = Depends(get_db),
    att_date: Optional[str] = Query(None, alias="date"),
    employee_id: Optional[int] = None,
    department: Optional[str] = None,
    gender: Optional[str] = None,
    status: Optional[str] = None,
):
    parsed_date = date.fromisoformat(att_date) if att_date else None
    records = _attendance_query(
        db, parsed_date, employee_id, department, gender, status
    ).all()
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([
        "Employee ID", "Name", "Department", "Gender", "Date", "Check In",
        "Lunch Out", "Lunch In", "Check Out", "Status", "Late", "Lunch Exceeded",
        "Exceeded Minutes", "Early Checkout", "Working Hours", "Overtime Hours",
    ])
    for r in records:
        emp = r.employee
        d = attendance_to_dict(r, emp)
        writer.writerow([
            d.get("employee_code") or d["employee_id"],
            d.get("employee_name", ""),
            d.get("department", ""),
            d.get("gender", ""),
            d.get("attendance_date", ""),
            d.get("check_in_time", ""),
            d.get("lunch_out_time", ""),
            d.get("lunch_in_time", ""),
            d.get("check_out_time", ""),
            d.get("status", ""),
            d.get("late_status"),
            d.get("lunch_exceeded_status"),
            d.get("lunch_exceeded_minutes"),
            d.get("early_checkout_status"),
            d.get("working_hours"),
            d.get("overtime_hours"),
        ])
    buffer.seek(0)
    filename = f"attendance_{parsed_date or today_local()}.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# 🗓️ MARK ATTENDANCE (face biometric — auto event detection)
@app.post("/attendance", response_model=schemas.AttendanceResponse)
def mark_attendance(att: schemas.AttendanceCreate, db: Session = Depends(get_db)):
    try:
        return process_biometric(
            db,
            att.employee_id,
            confidence=att.confidence,
            event_type=att.event_type,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

# 📸 REGISTER FACE
@app.post("/register-face")
def register_face(req: schemas.FaceRegistrationRequest, db: Session = Depends(get_db)):
    if not req.images:
        raise HTTPException(status_code=400, detail="No images provided")

    emp_id = int(req.employee_id)
    emp = db.query(models.Employee).filter(models.Employee.employee_id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    encodings_list = []
    failed_steps = []
    for idx, b64_img in enumerate(req.images):
        try:
            img = decode_base64_image(b64_img)
            encoding = extract_face_encoding_from_bgr(img)
            if encoding is not None:
                encodings_list.append(encoding)
            else:
                failed_steps.append(idx + 1)
        except Exception:
            failed_steps.append(idx + 1)

    if len(encodings_list) < MIN_REGISTRATION_FACES:
        failed_hint = (
            f" Failed capture step(s): {failed_steps}." if failed_steps else ""
        )
        raise HTTPException(
            status_code=400,
            detail=(
                f"Detected {len(encodings_list)} of {len(req.images)} faces. "
                f"Need at least {MIN_REGISTRATION_FACES} clear, front-facing shots "
                f"with good lighting.{failed_hint}"
            ),
        )

    averaged_encoding = normalize_encoding(np.mean(encodings_list, axis=0))

    # Replace previous encodings so re-registration truly overwrites
    db.query(models.FaceEncoding).filter(
        models.FaceEncoding.employee_id == emp_id
    ).delete()

    new_encoding = models.FaceEncoding(
        employee_id=emp_id,
        encoding=averaged_encoding.tolist()
    )
    db.add(new_encoding)
    db.commit()

    return {
        "message": "Face registered successfully",
        "employee_id": emp_id,
        "faces_used": len(encodings_list),
        "faces_total": len(req.images),
    }

# 🤖 RECOGNIZE FACE
@app.post("/recognize-face")
def recognize_face(req: schemas.FaceRecognitionRequest, db: Session = Depends(get_db)):
    db_encodings = db.query(models.FaceEncoding).all()
    if not db_encodings:
        return {"matched": False, "employee_id": None, "confidence": 0}

    known_ids = [enc.employee_id for enc in db_encodings]
    known_encodings = [np.array(enc.encoding) for enc in db_encodings]

    try:
        img = decode_base64_image(req.image)
        face_encoding = extract_face_encoding_from_bgr(img)
        if face_encoding is None:
            return {
                "matched": False,
                "employee_id": None,
                "confidence": 0,
                "reason": "no_face",
            }

        matched_id, similarity, _runner_up = find_best_match(
            known_encodings, known_ids, face_encoding
        )
        confidence = float(similarity)

        if matched_id is not None:
            now = datetime.utcnow()
            if matched_id not in recent_matches:
                recent_matches[matched_id] = []

            recent_matches[matched_id].append(now)
            recent_matches[matched_id] = [
                t for t in recent_matches[matched_id] if now - t <= TIME_WINDOW
            ]

            if len(recent_matches[matched_id]) >= MATCH_THRESHOLD:
                recent_matches[matched_id] = []
                return {
                    "matched": True,
                    "employee_id": matched_id,
                    "confidence": confidence,
                }

            return {
                "matched": False,
                "employee_id": matched_id,
                "confidence": confidence,
                "waiting": True,
            }

        return {
            "matched": False,
            "employee_id": None,
            "confidence": confidence,
            "reason": "no_match",
        }

    except Exception as e:
        return {"matched": False, "employee_id": None, "confidence": 0, "error": str(e)}

# 🗑️ ADMIN RESET EMPLOYEES
@app.delete("/admin/reset-employees")
def reset_employees(db: Session = Depends(get_db)):
    db.query(models.Employee).delete()
    db.commit()
    return {"message": "All employees deleted"}

# 🗑️ ADMIN RESET ATTENDANCE
@app.delete("/admin/reset-attendance")
def reset_attendance(db: Session = Depends(get_db)):
    db.query(models.Attendance).delete()
    db.commit()
    return {"message": "All attendance records deleted"}

# 🗑️ ADMIN RESET ALL
@app.delete("/admin/reset-all")
def reset_all(db: Session = Depends(get_db)):
    db.query(models.Employee).delete()
    # Models will cascade delete FaceEncodings and Attendance
    db.commit()
    return {"message": "System fully reset"}