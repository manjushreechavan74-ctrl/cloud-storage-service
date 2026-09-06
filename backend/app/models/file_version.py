from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FileVersion(Base):
    __tablename__ = "file_versions"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    file_id: Mapped[int] = mapped_column(
        ForeignKey("files.id"),
        nullable=False,
        index=True
    )

    version_number: Mapped[int] = mapped_column(
        nullable=False
    )

    storage_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False
    )

    filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    content_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    size: Mapped[int] = mapped_column(
        nullable=False
    )

    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )