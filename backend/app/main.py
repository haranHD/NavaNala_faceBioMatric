import os
import base64
import numpy as np
import cv2
import face_recognition
from datetime import datetime, timedelta
from typing import List, Dict
import json

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app import models, schemas

# We recreate the DB schema if needed
Base.metadata.create_all(bind=engine)

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
MATCH_THRESHOLD = 3  # frames
TIME_WINDOW = timedelta(seconds=5)  # matches must be within 5 seconds

def decode_base64_image(base64_string):
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]
    image_data = base64.b64decode(base64_string)
    nparr = np.frombuffer(image_data, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

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

    emp.name = updated.name
    emp.department = updated.department
    emp.role = updated.role

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

# 🗓️ GET ATTENDANCE
@app.get("/attendance", response_model=List[schemas.AttendanceResponse])
def get_attendance(db: Session = Depends(get_db)):
    records = db.query(models.Attendance).order_by(models.Attendance.check_in.desc()).all()
    result = []
    for r in records:
        result.append({
            "attendance_id": r.attendance_id,
            "employee_id": r.employee_id,
            "status": r.status,
            "confidence": r.confidence,
            "check_in": r.check_in.isoformat() + "Z" if r.check_in else None
        })
    return result

# 🗓️ MARK ATTENDANCE
@app.post("/attendance")
def mark_attendance(att: schemas.AttendanceCreate, db: Session = Depends(get_db)):
    five_mins_ago = datetime.utcnow() - timedelta(minutes=5)
    recent = db.query(models.Attendance).filter(
        models.Attendance.employee_id == att.employee_id,
        models.Attendance.check_in >= five_mins_ago
    ).first()

    if recent:
        return {"message": "Attendance already marked recently", "employee_id": att.employee_id}

    record = models.Attendance(
        employee_id=att.employee_id,
        status=att.status,
        confidence=att.confidence
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {"message": "Attendance marked", "employee_id": att.employee_id}

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
    for b64_img in req.images:
        try:
            img = decode_base64_image(b64_img)
            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            face_locations = face_recognition.face_locations(rgb)
            if face_locations:
                encs = face_recognition.face_encodings(rgb, face_locations, num_jitters=10)
                if encs:
                    encodings_list.append(encs[0])
        except Exception as e:
            continue

    if not encodings_list:
        raise HTTPException(status_code=400, detail="No valid faces found in the provided images")

    # Average the encodings
    averaged_encoding = np.mean(encodings_list, axis=0)

    # Store in DB as JSON array
    new_encoding = models.FaceEncoding(
        employee_id=emp_id,
        encoding=averaged_encoding.tolist()
    )
    db.add(new_encoding)
    db.commit()

    return {"message": "Face registered successfully", "employee_id": emp_id}

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
        small_img = cv2.resize(img, (0, 0), fx=0.5, fy=0.5)
        rgb = cv2.cvtColor(small_img, cv2.COLOR_BGR2RGB)
        
        face_locations = face_recognition.face_locations(rgb)
        if not face_locations:
            return {"matched": False, "employee_id": None, "confidence": 0}

        face_encodings = face_recognition.face_encodings(rgb, face_locations)
        if not face_encodings:
            return {"matched": False, "employee_id": None, "confidence": 0}

        face_encoding = face_encodings[0]
        
        TOLERANCE = 0.48
        face_distances = face_recognition.face_distance(known_encodings, face_encoding)
        best_match_index = np.argmin(face_distances)
        distance = face_distances[best_match_index]

        if distance <= TOLERANCE:
            matched_id = known_ids[best_match_index]
            confidence = 1 - distance

            # Multi-frame validation
            now = datetime.utcnow()
            if matched_id not in recent_matches:
                recent_matches[matched_id] = []
            
            recent_matches[matched_id].append(now)
            recent_matches[matched_id] = [t for t in recent_matches[matched_id] if now - t <= TIME_WINDOW]

            if len(recent_matches[matched_id]) >= MATCH_THRESHOLD:
                recent_matches[matched_id] = [] 
                return {"matched": True, "employee_id": matched_id, "confidence": float(confidence)}
            else:
                return {"matched": False, "employee_id": None, "confidence": float(confidence), "waiting": True}
        else:
            return {"matched": False, "employee_id": None, "confidence": float(1 - distance)}

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