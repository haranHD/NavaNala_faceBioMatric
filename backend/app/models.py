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

class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    embedding_id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.employee_id"))
    embedding = Column(JSONB)
    image_path = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())

from datetime import datetime
from app.database import Base
from sqlalchemy import Column, Integer, String, DateTime

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, nullable=False)
    status = Column(String, default="Present")
    timestamp = Column(DateTime, default=datetime.utcnow)