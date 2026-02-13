from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import os

import crud, models, schemas, database

app = FastAPI(title="Teletrabajo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/login", response_model=schemas.UserOut)
def login(login_data: schemas.UserLogin, db: Session = Depends(database.get_db)):
    user = crud.get_user_by_email(db, login_data.email)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Also try to get worker info
    trabajador = db.query(models.Trabajador).filter(
        models.Trabajador.id_usuario == user.id,
        models.Trabajador.fechabaja == None
    ).first()
    return {
        "id": user.id,
        "email": user.email,
        "nombre": trabajador.nombre if trabajador else "Usuario",
        "departamento": trabajador.nombredep or trabajador.coddep if trabajador else "Sin Departamento",
        "cod_dep": trabajador.deptonomi if trabajador else None,
        "deptonomi": trabajador.deptonomi if trabajador else None,
        "nivel": trabajador.categoria if trabajador else "Empleado"
    }

@app.get("/collaborators", response_model=List[dict])
def get_collaborators(deptonomi: str, db: Session = Depends(database.get_db)):
    # 1. Get all active workers in this department
    # Change: avoid using the last digit for collaborator selection
    dept_prefix = deptonomi[:-1] if deptonomi else ""
    
    workers = db.query(models.Trabajador).filter(
        models.Trabajador.deptonomi.like(f"{dept_prefix}%"),
        models.Trabajador.fechabaja == None
    ).all()
    
    collaborators_data = []
    for w in workers:
        # 2. For each worker, get their telework records
        tw_records = db.query(models.Teletrabajo.fecha, models.Teletrabajo.descripcion).filter(
            models.Teletrabajo.id_usuario == w.id_usuario
        ).all()
        
        collaborators_data.append({
            "nombre": w.nombre,
            "fechas": [{"fecha": str(r.fecha), "descripcion": r.descripcion} for r in tw_records],
            "id_usuario": w.id_usuario
        })
    
    return collaborators_data

@app.get("/teletrabajos/", response_model=List[schemas.Teletrabajo])
def read_teletrabajos(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    return crud.get_teletrabajos(db, skip=skip, limit=limit)

@app.post("/teletrabajos/", response_model=schemas.Teletrabajo)
def create_teletrabajo(teletrabajo: schemas.TeletrabajoCreate, db: Session = Depends(database.get_db)):
    return crud.create_teletrabajo(db=db, teletrabajo=teletrabajo)

@app.delete("/teletrabajos/{tele_id}")
def delete_teletrabajo(tele_id: int, db: Session = Depends(database.get_db)):
    success = crud.delete_teletrabajo(db, tele_id=tele_id)
    if not success:
        raise HTTPException(status_code=404, detail="Teletrabajo not found")
    return {"detail": "Successfully deleted"}

# Serve Frontend
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CLIENT_DIR = os.path.join(BASE_DIR, "client")

@app.get("/")
async def read_index():
    return FileResponse(os.path.join(CLIENT_DIR, "index.html"))

app.mount("/", StaticFiles(directory=CLIENT_DIR), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
