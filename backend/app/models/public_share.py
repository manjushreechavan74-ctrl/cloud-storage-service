import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PublicShare(Base):
    __tablename__ = "public_shares"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    token: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        default=lambda: str(uuid.uuid4())
    )

    owner_id: Mapped[int] = mapped_column(
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

    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )