from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.file import File
from app.models.folder import Folder
from app.models.share import Share
from app.models.user import User
from app.schemas.share import CreateShareRequest, ShareResponse


router = APIRouter(
    prefix="/shares",
    tags=["Sharing"]
)


@router.post(
    "",
    response_model=ShareResponse,
    status_code=status.HTTP_201_CREATED
)
def create_share(
    data: CreateShareRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Exactly one resource must be provided
    if (data.file_id is None) == (data.folder_id is None):
        raise HTTPException(
            status_code=400,
            detail="Provide either file_id or folder_id"
        )

    # User being shared with must exist
    target_user = (
        db.query(User)
        .filter(User.id == data.user_id)
        .first()
    )

    if not target_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot share with yourself"
        )

    # File sharing
    if data.file_id is not None:
        file_record = (
            db.query(File)
            .filter(
                File.id == data.file_id,
                File.user_id == current_user.id,
                File.deleted_at.is_(None)
            )
            .first()
        )

        if not file_record:
            raise HTTPException(
                status_code=404,
                detail="File not found"
            )

        existing_share = (
            db.query(Share)
            .filter(
                Share.file_id == data.file_id,
                Share.user_id == data.user_id
            )
            .first()
        )

    # Folder sharing
    else:
        folder = (
            db.query(Folder)
            .filter(
                Folder.id == data.folder_id,
                Folder.user_id == current_user.id
            )
            .first()
        )

        if not folder:
            raise HTTPException(
                status_code=404,
                detail="Folder not found"
            )

        existing_share = (
            db.query(Share)
            .filter(
                Share.folder_id == data.folder_id,
                Share.user_id == data.user_id
            )
            .first()
        )

    if existing_share:
        raise HTTPException(
            status_code=400,
            detail="Resource already shared with this user"
        )

    share = Share(
        owner_id=current_user.id,
        user_id=data.user_id,
        file_id=data.file_id,
        folder_id=data.folder_id,
        role=data.role
    )

    db.add(share)
    db.commit()
    db.refresh(share)

    return share