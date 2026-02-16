from sqlalchemy.orm import Session
import models, schemas

def get_user_by_email(db: Session, email: str):
    return db.query(models.Usuario).filter(models.Usuario.email == email).first()

def get_teletrabajos(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Teletrabajo).offset(skip).limit(limit).all()

def create_teletrabajo(db: Session, teletrabajo: schemas.TeletrabajoCreate):
    db_tele = models.Teletrabajo(**teletrabajo.dict())
    db.add(db_tele)
    db.commit()
    db.refresh(db_tele)
    return db_tele

def delete_teletrabajo(db: Session, tele_id: int):
    db_tele = db.query(models.Teletrabajo).filter(models.Teletrabajo.id == tele_id).first()
    if db_tele:
        db.delete(db_tele)
        db.commit()
        return True
    return False

def get_config(db: Session):
    return db.query(models.Configuracion).first()

def create_default_config(db: Session):
    db_config = models.Configuracion(max_quarterly_days=30, min_presence_daily=50, block_max_days=False, block_min_presence=False)
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config

def update_config(db: Session, config: schemas.ConfiguracionCreate):
    db_config = db.query(models.Configuracion).first()
    if not db_config:
        db_config = create_default_config(db)
    
    db_config.max_quarterly_days = config.max_quarterly_days
    db_config.min_presence_daily = config.min_presence_daily
    db_config.block_max_days = config.block_max_days
    db_config.block_min_presence = config.block_min_presence
    
    db.commit()
    db.refresh(db_config)
    return db_config
