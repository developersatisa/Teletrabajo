# Proyecto de Control de Teletrabajo

Este proyecto consiste en una API backend con FastAPI y una interfaz de dashboard visual para la gestión de días de teletrabajo.

## Estructura del Proyecto

- `main.py`: Punto de entrada de la API FastAPI.
- `database.py`: Configuración de la conexión a la base de datos (SQLAlchemy).
- `models.py`: Modelos de la base de datos.
- `schemas.py`: Modelos de validación Pydantic.
- `crud.py`: Operaciones CRUD sobre la base de datos.
- `schema.sql`: Script SQL para la creación manual de la tabla.
- `client/`: Aplicación frontend (HTML/CSS/JS).

## Requisitos

- Python 3.8+
- Una base de datos MySQL (o SQLite por defecto para pruebas locales).

## Instalación

1. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```

2. Configura tu base de datos en un archivo `.env` o modifica `database.py`:
   ```env
   DATABASE_URL=mysql+mysqlconnector://usuario:password@localhost/nombre_bd
   ```
   *(Si no se configura, usará SQLite `teletrabajo.db` automáticamente).*

## Ejecución

1. Inicia el servidor backend:
   ```bash
   python main.py
   ```
   O usando uvicorn:
   ```bash
   uvicorn main:app --reload
   ```

2. Abre la aplicación cliente:
   Simplemente abre `client/index.html` en tu navegador o usa un servidor estático.

## Características del Dashboard

- **Calendario Interactivo:** Visualiza los días de teletrabajo agendados. Haz clic en un día para iniciar una nueva solicitud.
- **Formulario de Solicitud:** Gestiona datos como solicitante, departamento, nivel y periodo.
- **Diseño Premium:** Interfaz moderna con glassmorphism, fuentes optimizadas y animaciones suaves.
