from pydantic import BaseModel, Field


class FolderCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    parent_id: int | None = None


class FolderResponse(BaseModel):
    id: int
    name: str
    parent_id: int | None

class Config:
    from_attributes = True

class RenameFolderRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)