from sqlalchemy import Column, Integer, String, Float, ForeignKey, TIMESTAMP, Text, JSON, DateTime, Date, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from app.database import Base


class Employee(Base):
    __tablename__ = "employees"

    employee_id = Column(Integer, primary_key=True, index=True)
    employee_code = Column(String(20), unique=True, nullable=True, index=True)
    name = Column(String(100), nullable=False)
    department = Column(String(100))
    role = Column(String(100))
    gender = Column(String(10), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    encodings = relationship("FaceEncoding", back_populates="employee", cascade="all, delete-orphan")
    attendance_records = relationship("Attendance", back_populates="employee", cascade="all, delete-orphan")
    permissions = relationship("Permission", back_populates="employee", cascade="all, delete-orphan")


class FaceEncoding(Base):
    __tablename__ = "face_encodings"

    encoding_id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False)
    encoding = Column(JSON, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    employee = relationship("Employee", back_populates="encodings")


class Attendance(Base):
    __tablename__ = "attendance"

    attendance_id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False)
    attendance_date = Column(Date, nullable=True, index=True)

    check_in = Column(DateTime, default=datetime.utcnow)
    check_out = Column(DateTime, nullable=True)
    check_in_time = Column(DateTime, nullable=True)
    lunch_out_time = Column(DateTime, nullable=True)
    lunch_in_time = Column(DateTime, nullable=True)
    check_out_time = Column(DateTime, nullable=True)

    late_status = Column(Boolean, default=False)
    lunch_exceeded_status = Column(Boolean, default=False)
    lunch_exceeded_minutes = Column(Float, nullable=True)
    early_checkout_status = Column(Boolean, default=False)
    early_checkout_reason = Column(String(255), nullable=True)
    working_hours = Column(Float, nullable=True)
    overtime_hours = Column(Float, nullable=True)
    attendance_status = Column(String(50), nullable=True)
    permission_used_minutes = Column(Integer, default=0)

    confidence = Column(Float, nullable=True)
    camera_id = Column(String(50), nullable=True)
    snapshot_path = Column(Text, nullable=True)
    status = Column(String(50), default="Pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="attendance_records")


class Permission(Base):
    __tablename__ = "permissions"

    permission_id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False)
    permission_date = Column(Date, nullable=False, index=True)
    from_time = Column(String(8), nullable=False)
    to_time = Column(String(8), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="permissions")
