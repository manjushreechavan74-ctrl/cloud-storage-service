from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.database import Base, engine

# Models
from app.models.user import User
from app.models.file import File
from app.models.folder import Folder
from app.models.public_share import PublicShare
from app.models.file_version import FileVersion

# Routers
from app.routes.auth import router as auth_router
from app.routes.files import router as files_router
from app.routes.folders import router as folders_router
from app.routes.shares import router as shares_router
from app.routes.public_shares import router as public_shares_router
from app.routes.stars import router as stars_router


# =========================================================
# CREATE DATABASE TABLES
# =========================================================

Base.metadata.create_all(bind=engine)


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title="Cloud Storage Service",
    description="Cloud Based Media File Storage Service",
    version="1.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://cloud-storage-service-ten.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# ROUTERS
# =========================================================

app.include_router(auth_router)
app.include_router(files_router)
app.include_router(folders_router)
app.include_router(shares_router)
app.include_router(public_shares_router)
app.include_router(stars_router)


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "message": "Cloud Storage Service API is running"
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "database": "connected"
        }

    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }