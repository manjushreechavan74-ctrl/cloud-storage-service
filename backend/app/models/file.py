from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class File(Base):
    __tablename__ = "files"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    folder_id: Mapped[int | None] = mapped_column(
        ForeignKey("folders.id"),
        nullable=True,
        index=True
    )

    filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True
    )

    storage_path: Mapped[str] = mapped_column(
        String(500),
        unique=True,
        nullable=False
    )

    content_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True
    )

    size: Mapped[int] = mapped_column(
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        index=True
    )