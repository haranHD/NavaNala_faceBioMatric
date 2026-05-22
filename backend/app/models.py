from sqlalchemy import Column, Integer, String, Float, ForeignKey, TIMESTAMP, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.database import Base


class Employee(Base):
    __tablename__ = "employees"

    employee_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    department = Column(String(100))
    role = Column(String(100))
    created_at = Column(TIMESTAMP, server_default=func.now())


class Attendance(Base):
    __tablename__ = "attendance"

    attendance_id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"))
    check_in = Column(TIMESTAMP)
    check_out = Column(TIMESTAMP)
    confidence = Column(Float)
    camera_id = Column(String(50))
    snapshot_path = Column(Text)
    status = Column(String(50))
    created_at = Column(TIMESTAMP, server_default=func.now())


class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    embedding_id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"))
    embedding = Column(JSONB)
    image_path = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())