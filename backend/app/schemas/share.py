from pydantic import BaseModel, Field
from typing import Literal


class CreateShareRequest(BaseModel):
    user_id: int
    role: Literal["editor", "viewer"]
    file_id: int | None = None
    folder_id: int | None = None


class ShareResponse(BaseModel):
    id: int
    owner_id: int
    user_id: int
    file_id: int | None
    folder_id: int | None
    role: str