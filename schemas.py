from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List

class TeletrabajoBase(BaseModel):
    fecha: date
    descripcion: Optional[str] = None
    periodo: Optional[str] = None

class TeletrabajoCreate(TeletrabajoBase):
    id_usuario: int

class Teletrabajo(TeletrabajoBase):
    id: int
    id_usuario: int
    fechacreacion: datetime

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: str

class UserOut(BaseModel):
    id: int
    email: str
    nombre: str
    departamento: str
    cod_dep: Optional[str]
    deptonomi: Optional[str]
    nivel: str
