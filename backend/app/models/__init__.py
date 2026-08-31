from app.models.user import User
from app.models.file import File
from app.models.folder import Folder

from fastapi import FastAPI
from sqlalchemy import text

from app.core.database import Base, engine
from app.models.user import User


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Cloud Storage Service",
    description="Cloud Based Media File Storage Service",
    version="1.0.0"
)


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
        return 