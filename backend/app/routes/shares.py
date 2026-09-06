from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user

from app.models.file import File
from app.models.folder import Folder
from app.models.share import Share
from app.models.user import User

from app.schemas.share import (
    CreateShareRequest,
    ShareResponse,
)


router = APIRouter(
    prefix="/shares",
    tags=["Sharing"]
)


# =========================================================
# CREATE / UPDATE SHARE
# =========================================================

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
    # -----------------------------------------------------
    # EXACTLY ONE RESOURCE
    # -----------------------------------------------------

    if (data.file_id is None) == (data.folder_id is None):
        raise HTTPException(
            status_code=400,
            detail="Provide either file_id or folder_id"
        )

    # -----------------------------------------------------
    # FIND TARGET USER
    # -----------------------------------------------------

    if data.email:
        email = data.email.strip().lower()

        target_user = (
            db.query(User)
            .filter(
                User.email == email
            )
            .first()
        )

    elif data.user_id:
        target_user = (
            db.query(User)
            .filter(
                User.id == data.user_id
            )
            .first()
        )

    else:
        raise HTTPException(
            status_code=400,
            detail="Provide either email or user_id"
        )

    # -----------------------------------------------------
    # USER NOT FOUND
    # -----------------------------------------------------

    if not target_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # -----------------------------------------------------
    # CANNOT SHARE WITH YOURSELF
    # -----------------------------------------------------

    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot share with yourself"
        )

    existing_share = None

    # =====================================================
    # FILE SHARE
    # =====================================================

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
                Share.user_id == target_user.id
            )
            .first()
        )

    # =====================================================
    # FOLDER SHARE
    # =====================================================

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
                Share.user_id == target_user.id
            )
            .first()
        )

    # =====================================================
    # UPDATE EXISTING SHARE
    # =====================================================

    if existing_share:

        existing_share.role = data.role

        db.commit()
        db.refresh(existing_share)

        return existing_share

    # =====================================================
    # CREATE NEW SHARE
    # =====================================================

    share = Share(
        owner_id=current_user.id,
        user_id=target_user.id,
        file_id=data.file_id,
        folder_id=data.folder_id,
        role=data.role
    )

    db.add(share)

    db.commit()
    db.refresh(share)

    return share


# =========================================================
# LIST ITEMS SHARED WITH CURRENT USER
# =========================================================

@router.get("")
def list_shared_with_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    shares = (
        db.query(Share)
        .filter(
            Share.user_id == current_user.id
        )
        .all()
    )

    result = []

    for share in shares:

        item = {
            "share_id": share.id,
            "owner_id": share.owner_id,
            "user_id": share.user_id,
            "role": share.role,
            "file": None,
            "folder": None,
        }

        # -------------------------------------------------
        # SHARED FILE
        # -------------------------------------------------

        if share.file_id is not None:

            file_record = (
                db.query(File)
                .filter(
                    File.id == share.file_id,
                    File.deleted_at.is_(None)
                )
                .first()
            )

            if file_record:

                item["file"] = {
                    "id": file_record.id,
                    "filename": file_record.filename,
                    "content_type": file_record.content_type,
                    "size": file_record.size,
                    "folder_id": file_record.folder_id,
                }

        # -------------------------------------------------
        # SHARED FOLDER
        # -------------------------------------------------

        if share.folder_id is not None:

            folder = (
                db.query(Folder)
                .filter(
                    Folder.id == share.folder_id
                )
                .first()
            )

            if folder:

                item["folder"] = {
                    "id": folder.id,
                    "name": folder.name,
                    "parent_id": folder.parent_id,
                }

        # -------------------------------------------------
        # ONLY RETURN EXISTING RESOURCES
        # -------------------------------------------------

        if (
            item["file"] is not None
            or item["folder"] is not None
        ):
            result.append(item)

    return result


# =========================================================
# LIST PEOPLE WITH ACCESS TO FILE
# =========================================================

@router.get("/file/{file_id}")
def list_file_shares(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # -----------------------------------------------------
    # CHECK FILE OWNERSHIP
    # -----------------------------------------------------

    file_record = (
        db.query(File)
        .filter(
            File.id == file_id,
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

    # -----------------------------------------------------
    # GET SHARES
    # -----------------------------------------------------

    shares = (
        db.query(Share)
        .filter(
            Share.file_id == file_id,
            Share.owner_id == current_user.id
        )
        .all()
    )

    result = []

    # Owner is also shown
    result.append({
        "share_id": None,
        "user_id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role": "owner",
        "created_at": file_record.created_at,
    })

    # Shared users
    for share in shares:

        user = (
            db.query(User)
            .filter(
                User.id == share.user_id
            )
            .first()
        )

        if not user:
            continue

        result.append({
            "share_id": share.id,
            "user_id": user.id,
            "email": user.email,
            "name": user.name,
            "role": share.role,
            "created_at": share.created_at,
        })

    return result


# =========================================================
# REMOVE ACCESS
# =========================================================

@router.delete("/{share_id}")
def remove_share(
    share_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    share = (
        db.query(Share)
        .filter(
            Share.id == share_id,
            Share.owner_id == current_user.id
        )
        .first()
    )

    if not share:
        raise HTTPException(
            status_code=404,
            detail="Share not found"
        )

    db.delete(share)
    db.commit()

    return {
        "message": "Access removed successfully",
        "share_id": share_id
    }