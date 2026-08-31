from datetime import datetime

from pydantic import BaseModel, Field


class InitUploadRequest(BaseModel):

    filename: str

    content_type: str

    size: int


class InitUploadResponse(BaseModel):

    file_id: int

    upload_url: str

    storage_path: str


class RenameFileRequest(BaseModel):

    filename: str = Field(
        min_length=1,
        max_length=255
    )


class FileResponse(BaseModel):

    id: int
    filename: str
    content_type: str
    size: int
    storage_path: str
    folder_id: int | None


class TrashFileResponse(BaseModel):

    id: int
    filename: str
    content_type: str
    size: int
    storage_path: str
    folder_id: int | None
    deleted_at: datetime