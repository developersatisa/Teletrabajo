from sqlalchemy import Column, Integer, String, Date, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = {"schema": "e01101"}
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    nombre = Column(String(255)) # Some db schemas use this for full name

class Trabajador(Base):
    __tablename__ = "trabajadores"
    __table_args__ = {"schema": "e01101"}
    id_usuario = Column(Integer, ForeignKey("e01101.usuarios.id"), primary_key=True)
    nombre = Column(String(255))
    coddep = Column(String(100))
    nombredep = Column(String(100))
    deptonomi = Column(String(100))
    categoria = Column(String(50))
    fechabaja = Column(Date, nullable=True) # Added to filter for active workers

class Teletrabajo(Base):
    __tablename__ = "teletrabajo"

    id = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, nullable=False)
    fechacreacion = Column(DateTime, server_default=func.now())
    fecha = Column(Date, nullable=False)
    descripcion = Column(Text)
    periodo = Column(String(100))

class Configuracion(Base):
    __tablename__ = "configuracion"

    id = Column(Integer, primary_key=True, index=True)
    max_quarterly_days = Column(Integer, default=30)
    min_presence_daily = Column(Integer, default=50)
    block_max_days = Column(Boolean, default=False)
    block_min_presence = Column(Boolean, default=False)
