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

    class Config:
        from_attributes = True

class ConfiguracionBase(BaseModel):
    max_quarterly_days: int
    min_presence_daily: int
    block_max_days: bool
    block_min_presence: bool

class ConfiguracionCreate(ConfiguracionBase):
    pass

class Configuracion(ConfiguracionBase):
    id: int
    
    class Config:
        from_attributes = True
