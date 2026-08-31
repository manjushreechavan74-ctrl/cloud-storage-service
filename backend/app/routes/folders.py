from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.folder import Folder
from app.models.user import User
from app.schemas.folder import FolderCreateRequest, FolderResponse
from app.schemas.folder import RenameFolderRequest
from app.models.file import File

router = APIRouter(
    prefix="/folders",
    tags=["Folders"]
)


@router.post(
    "",
    response_model=FolderResponse,
    status_code=status.HTTP_201_CREATED
)
def create_folder(
    data: FolderCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if data.parent_id is not None:
        parent = (
            db.query(Folder)
            .filter(
                Folder.id == data.parent_id,
                Folder.user_id == current_user.id
            )
            .first()
        )

        if not parent:
            raise HTTPException(
                status_code=404,
                detail="Parent folder not found"
            )

    existing_folder = (
        db.query(Folder)
        .filter(
            Folder.user_id == current_user.id,
            Folder.name == data.name,
            Folder.parent_id == data.parent_id
        )
        .first()
    )

    if existing_folder:
        raise HTTPException(
            status_code=400,
            detail="Folder already exists"
        )

    folder = Folder(
        user_id=current_user.id,
        name=data.name,
        parent_id=data.parent_id
    )

    db.add(folder)
    db.commit()
    db.refresh(folder)

    return folder

@router.get(
    "",
    response_model=list[FolderResponse]
)
def list_folders(
    parent_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    folders = (
        db.query(Folder)
        .filter(
            Folder.user_id == current_user.id,
            Folder.parent_id == parent_id
        )
        .order_by(Folder.name)
        .all()
    )

    return folders

@router.get(
    "/{folder_id}/breadcrumbs"
)
def get_breadcrumbs(
    folder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    breadcrumbs = []

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

    while folder:
        breadcrumbs.append({
            "id": folder.id,
            "name": folder.name
        })

        if folder.parent_id is None:
            break

        folder = (
            db.query(Folder)
            .filter(
                Folder.id == folder.parent_id,
                Folder.user_id == current_user.id
            )
            .first()
        )

    breadcrumbs.reverse()

    return breadcrumbs

@router.get("/{folder_id}")
def get_folder(
    folder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
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

    return {
        "id": folder.id,
        "name": folder.name,
        "parent_id": folder.parent_id
    }

@router.patch("/{folder_id}")
def rename_folder(
    folder_id: int,
    data: RenameFolderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
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

    folder.name = data.name

    db.commit()
    db.refresh(folder)

    return {
        "id": folder.id,
        "name": folder.name,
        "parent_id": folder.parent_id
    }

@router.delete("/{folder_id}")
def delete_folder(
    folder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
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

    # Don't allow deleting a folder that contains subfolders
    child_folder = (
        db.query(Folder)
        .filter(
            Folder.parent_id == folder_id,
            Folder.user_id == current_user.id
        )
        .first()
    )

    if child_folder:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete folder containing subfolders"
        )

    # Move files in this folder back to root
    db.query(File).filter(
        File.folder_id == folder_id,
        File.user_id == current_user.id
    ).update(
        {"folder_id": None},
        synchronize_session=False
    )

    db.delete(folder)
    db.commit()

    return {
        "message": "Folder deleted successfully",
        "folder_id": folder_id
    }