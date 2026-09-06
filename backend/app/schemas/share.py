from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


# =========================================================
# CREATE SHARE
# =========================================================

class CreateShareRequest(BaseModel):

    email: str | None = Field(
        default=None,
        max_length=255
    )

    user_id: int | None = Field(
        default=None,
        gt=0
    )

    role: Literal[
        "editor",
        "viewer"
    ] = "viewer"

    file_id: int | None = Field(
        default=None,
        gt=0
    )

    folder_id: int | None = Field(
        default=None,
        gt=0
    )

    @model_validator(mode="after")
    def validate_request(self):

        # Recipient
        if self.email is None and self.user_id is None:
            raise ValueError(
                "Provide either email or user_id"
            )

        if (
            self.email is not None
            and self.user_id is not None
        ):
            raise ValueError(
                "Provide either email or user_id, not both"
            )

        # Resource
        if (
            self.file_id is None
            and self.folder_id is None
        ):
            raise ValueError(
                "Provide either file_id or folder_id"
            )

        if (
            self.file_id is not None
            and self.folder_id is not None
        ):
            raise ValueError(
                "Provide either file_id or folder_id, not both"
            )

        return self


# =========================================================
# SHARE RESPONSE
# =========================================================

class ShareResponse(BaseModel):

    id: int
    owner_id: int
    user_id: int
    file_id: int | None
    folder_id: int | None
    role: str

    class Config:
        from_attributes = True


# =========================================================
# PUBLIC SHARE
# =========================================================

class CreatePublicShareRequest(BaseModel):

    file_id: int | None = Field(
        default=None,
        gt=0
    )

    folder_id: int | None = Field(
        default=None,
        gt=0
    )

    expires_in_days: int | None = Field(
        default=7,
        ge=1,
        le=365
    )

    @model_validator(mode="after")
    def validate_resource(self):

        if (
            self.file_id is None
            and self.folder_id is None
        ):
            raise ValueError(
                "Provide either file_id or folder_id"
            )

        if (
            self.file_id is not None
            and self.folder_id is not None
        ):
            raise ValueError(
                "Provide either file_id or folder_id, not both"
            )

        return self


# =========================================================
# PUBLIC SHARE RESPONSE
# =========================================================

class PublicShareResponse(BaseModel):

    id: int
    token: str
    file_id: int | None
    folder_id: int | None
    expires_at: datetime | None
    public_url: str