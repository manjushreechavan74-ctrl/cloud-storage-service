from fastapi import FastAPI
from sqlalchemy import text

from app.core.database import Base, engine
from app.models.user import User
from app.models.file import File
from app.models.folder import Folder
from app.routes.auth import router as auth_router
from app.routes.files import router as files_router
from app.routes.folders import router as folders_router
from app.routes.shares import router as shares_router
from app.models.public_share import PublicShare
from app.routes.public_shares import router as public_shares_router

Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Cloud Storage Service",
    description="Cloud Based Media File Storage Service",
    version="1.0.0"
)

app.include_router(auth_router)
app.include_router(files_router)
app.include_router(folders_router)
app.include_router(shares_router)
app.include_router(public_shares_router)


@app.get("/")
def root():
    return {
        "message": "Cloud Storage Service API is running"
    }


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