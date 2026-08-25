from fastapi import FastAPI

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
    return {
        "status": "healthy"
    }