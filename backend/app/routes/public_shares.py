from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.file import File
from app.models.folder import Folder
from app.models.public_share import PublicShare
from app.models.user import User


router = APIRouter(
    prefix="/public-shares",
    tags=["Public Sharing"]
)


@router.post("")
def create_public_share(
    file_id: int | None = None,
    folder_id: int | None = None,
    expires_at: datetime | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Exactly one resource must be provided
    if (file_id is None) == (folder_id is None):
        raise HTTPException(
            status_code=400,
            detail="Provide either file_id or folder_id"
        )

    # File
    if file_id is not None:
        file_record = (
            db.query(File)
            .filter(
                File.id == file_id,
                File.user_id == current_user.id
            )
            .first()
        )

        if not file_record:
            raise HTTPException(
                status_code=404,
                detail="File not found"
            )

    # Folder
    if folder_id is not None:
        folder = (
            db.query(Folder)
            .filter(
                Folder.id == folder_id,
                Folder.user_id == current_user.id
            )
            .first()
        )

        if not folder:
            raise HTTPException(
                status_code=404,
                detail="Folder not found"
            )

    # Expiry must be in the future
    if expires_at is not None and expires_at <= datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="Expiry time must be in the future"
        )

    public_share = PublicShare(
        owner_id=current_user.id,
        file_id=file_id,
        folder_id=folder_id,
        expires_at=expires_at
    )

    db.add(public_share)
    db.commit()
    db.refresh(public_share)

    return {
        "id": public_share.id,
        "token": public_share.token,
        "file_id": public_share.file_id,
        "folder_id": public_share.folder_id,
        "expires_at": public_share.expires_at
    }

@router.get("/{token}")
def access_public_share(
    token: str,
    db: Session = Depends(get_db)
):
    public_share = (
        db.query(PublicShare)
        .filter(PublicShare.token == token)
        .first()
    )

    if not public_share:
        raise HTTPException(
            status_code=404,
            detail="Public share not found"
        )

    if (
        public_share.expires_at is not None
        and public_share.expires_at <= datetime.utcnow()
    ):
        raise HTTPException(
            status_code=410,
            detail="Public share has expired"
        )

    if public_share.file_id is not None:
        file_record = (
            db.query(File)
            .filter(File.id == public_share.file_id)
            .first()
        )

        if not file_record:
            raise HTTPException(
                status_code=404,
                detail="File not found"
            )

        return {
            "type": "file",
            "id": file_record.id,
            "filename": file_record.filename,
            "content_type": file_record.content_type,
            "size": file_record.size,
            "storage_path": file_record.storage_path
        }

    if public_share.folder_id is not None:
        folder = (
            db.query(Folder)
            .filter(Folder.id == public_share.folder_id)
            .first()
        )

        if not folder:
            raise HTTPException(
                status_code=404,
                detail="Folder not found"
            )

        return {
            "type": "folder",
            "id": folder.id,
            "name": folder.name
        }

    