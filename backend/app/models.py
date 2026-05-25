from sqlalchemy import Column, Integer, String, Float, ForeignKey, TIMESTAMP, Text, JSON, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from app.database import Base


class Employee(Base):
    __tablename__ = "employees"

    employee_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    department = Column(String(100))
    role = Column(String(100))
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Cascade deletes: if an employee is deleted, their encodings and attendance are automatically deleted.
    encodings = relationship("FaceEncoding", back_populates="employee", cascade="all, delete-orphan")
    attendance_records = relationship("Attendance", back_populates="employee", cascade="all, delete-orphan")


class FaceEncoding(Base):
    __tablename__ = "face_encodings"

    encoding_id = Column(Integer, primary_key=True, index=True)
    # ondelete="CASCADE" ensures DB-level cascading as well
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False)
    # Using generic JSON which is compatible with SQLite and other DBs
    encoding = Column(JSON, nullable=False) 
    created_at = Column(TIMESTAMP, server_default=func.now())

    employee = relationship("Employee", back_populates="encodings")


class Attendance(Base):
    __tablename__ = "attendance"

    attendance_id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False)
    check_in = Column(DateTime, default=datetime.utcnow)
    check_out = Column(DateTime, nullable=True)
    confidence = Column(Float, nullable=True)
    camera_id = Column(String(50), nullable=True)
    snapshot_path = Column(Text, nullable=True)
    status = Column(String(50), default="Present")
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="attendance_records")