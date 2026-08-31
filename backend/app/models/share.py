from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ShareRole(str, Enum):
    OWNER = "owner"
    EDITOR = "editor"
    VIEWER = "viewer"


class Share(Base):
    __tablename__ = "shares"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    file_id: Mapped[int | None] = mapped_column(
        ForeignKey("files.id"),
        nullable=True,
        index=True
    )

    folder_id: Mapped[int | None] = mapped_column(
        ForeignKey("folders.id"),
        nullable=True,
        index=True
    )

    role: Mapped[ShareRole] = mapped_column(
        String(20),
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )