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
