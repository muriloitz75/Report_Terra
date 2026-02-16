from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="user")  # "admin" or "user"
    can_generate_report = Column(Boolean, default=False)

    processes = relationship("Process", back_populates="owner")
    reports = relationship("Report", back_populates="owner")

class Process(Base):
    __tablename__ = "processes"

    id = Column(String, primary_key=True, index=True) # "1234 - 2024"
    user_id = Column(Integer, ForeignKey("users.id"))
    
    contribuinte = Column(String)
    data_abertura = Column(String) # Keeping as string to match legacy regex format, or could migrate to Date
    ano = Column(String)
    status = Column(String, index=True)
    setor_atual = Column(String)
    tipo_solicitacao = Column(String, index=True)
    
    dias_atraso_pdf = Column(Integer, default=0)
    dias_atraso_calc = Column(Integer, default=0)
    is_atrasado = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="processes")

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    content = Column(Text) # Markdown content
    filtered_context = Column(JSON) # Snapshot of filters used
    
    user_rating = Column(String, nullable=True) # 'positive', 'negative'
    user_feedback = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="reports")
