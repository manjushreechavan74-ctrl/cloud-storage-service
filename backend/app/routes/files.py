import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.file_validation import (
    ALLOWED_CONTENT_TYPES,
    MAX_FILE_SIZE,
)
from app.core.permissions import require_file_permission
from app.core.storage import (
    get_storage,
    create_signed_download_url,
)
from app.models.file import File
from app.models.folder import Folder
from app.models.share import Share
from app.models.user import User
from app.schemas.file import (
    InitUploadRequest,
    InitUploadResponse,
    RenameFileRequest,
    FileResponse,
    TrashFileResponse,
)


router = APIRouter(
    prefix="/files",
    tags=["Files"]
)


@router.post(
    "/init-upload",
    response_model=InitUploadResponse,
    status_code=status.HTTP_201_CREATED
)
def init_upload(
    data: InitUploadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if data.size <= 0:
        raise HTTPException(
            status_code=400,
            detail="File size must be greater than zero"
        )

    if data.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds 50 MB limit"
        )

    if data.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="File type is not allowed"
        )

    extension = ""

    if "." in data.filename:
        extension = "." + data.filename.rsplit(".", 1)[1]

    unique_name = f"{uuid.uuid4()}{extension}"

    storage_path = f"{current_user.id}/{unique_name}"

    storage = get_storage()

    upload_url_response = storage.create_signed_upload_url(
        storage_path
    )

    if isinstance(upload_url_response, dict):
        upload_url = upload_url_response.get("signedURL")

        if not upload_url:
            upload_url = upload_url_response.get("signed_url")
    else:
        upload_url = getattr(
            upload_url_response,
            "signedURL",
            None
        )

        if not upload_url:
            upload_url = getattr(
                upload_url_response,
                "signed_url",
                None
            )

    if not upload_url:
        raise HTTPException(
            status_code=500,
            detail="Could not generate signed upload URL"
        )

    file_record = File(
        user_id=current_user.id,
        filename=data.filename,
        storage_path=storage_path,
        content_type=data.content_type,
        size=data.size,
    )

    db.add(file_record)
    db.commit()
    db.refresh(file_record)

    return InitUploadResponse(
        file_id=file_record.id,
        upload_url=upload_url,
        storage_path=storage_path,
    )


@router.get(
    "",
    response_model=list[FileResponse]
)
def list_files(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Files owned by the current user
    owned_files = (
        db.query(File)
        .filter(
            File.user_id == current_user.id,
            File.deleted_at.is_(None)
        )
        .all()
    )

    # 2. Files directly shared with the current user
    shared_files = (
        db.query(File)
        .join(
            Share,
            Share.file_id == File.id
        )
        .filter(
            Share.user_id == current_user.id,
            File.deleted_at.is_(None)
        )
        .all()
    )

    # 3. Files inside folders shared with the current user
    folder_shared_files = (
        db.query(File)
        .join(
            Share,
            Share.folder_id == File.folder_id
        )
        .filter(
            Share.user_id == current_user.id,
            File.folder_id.is_not(None),
            File.deleted_at.is_(None)
        )
        .all()
    )

    # Combine all files and remove duplicates
    files = {
        file.id: file
        for file in (
            owned_files
            + shared_files
            + folder_shared_files
        )
    }

    return sorted(
        files.values(),
        key=lambda file: file.filename.lower()
    )


@router.get(
    "/search",
    response_model=list[FileResponse]
)
def search_files(
    q: str | None = None,
    content_type: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Files owned by the current user
    owned_query = (
        db.query(File)
        .filter(
            File.user_id == current_user.id,
            File.deleted_at.is_(None)
        )
    )

    # 2. Files directly shared with the current user
    shared_query = (
        db.query(File)
        .join(
            Share,
            Share.file_id == File.id
        )
        .filter(
            Share.user_id == current_user.id,
            File.deleted_at.is_(None)
        )
    )

    # 3. Files inside folders shared with the current user
    folder_shared_query = (
        db.query(File)
        .join(
            Share,
            Share.folder_id == File.folder_id
        )
        .filter(
            Share.user_id == current_user.id,
            File.folder_id.is_not(None),
            File.deleted_at.is_(None)
        )
    )

    # Search by filename
    if q:
        search_term = f"%{q}%"

        owned_query = owned_query.filter(
            File.filename.ilike(search_term)
        )

        shared_query = shared_query.filter(
            File.filename.ilike(search_term)
        )

        folder_shared_query = folder_shared_query.filter(
            File.filename.ilike(search_term)
        )

    # Filter by content type
    if content_type:
        owned_query = owned_query.filter(
            File.content_type == content_type
        )

        shared_query = shared_query.filter(
            File.content_type == content_type
        )

        folder_shared_query = folder_shared_query.filter(
            File.content_type == content_type
        )

    owned_files = owned_query.all()
    shared_files = shared_query.all()
    folder_shared_files = folder_shared_query.all()

    # Combine all files and remove duplicates
    files = {
        file.id: file
        for file in (
            owned_files
            + shared_files
            + folder_shared_files
        )
    }

    return sorted(
        files.values(),
        key=lambda file: file.filename.lower()
    )


@router.get(
    "/trash",
    response_model=list[TrashFileResponse]
)
def list_trash(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trashed_files = (
        db.query(File)
        .filter(
            File.user_id == current_user.id,
            File.deleted_at.is_not(None)
        )
        .order_by(File.deleted_at.desc())
        .all()
    )

    return trashed_files


@router.post("/{file_id}/restore")
def restore_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
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

    if file_record.deleted_at is None:
        raise HTTPException(
            status_code=400,
            detail="File is not in trash"
        )

    file_record.deleted_at = None

    db.commit()
    db.refresh(file_record)

    return {
        "message": "File restored successfully",
        "file_id": file_record.id,
        "filename": file_record.filename,
        "folder_id": file_record.folder_id
    }


@router.get("/{file_id}/download")
def download_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_record = (
        db.query(File)
        .filter(File.id == file_id)
        .first()
    )

    if not file_record:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    if file_record.deleted_at is not None:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    require_file_permission(
        file_record,
        current_user,
        db,
        "viewer"
    )

    download_url = create_signed_download_url(
        file_record.storage_path
    )

    if not download_url:
        raise HTTPException(
            status_code=500,
            detail="Could not generate signed download URL"
        )

    return {
        "id": file_record.id,
        "filename": file_record.filename,
        "content_type": file_record.content_type,
        "size": file_record.size,
        "download_url": download_url
    }


@router.patch("/{file_id}/rename")
def rename_file(
    file_id: int,
    data: RenameFileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_record = (
        db.query(File)
        .filter(File.id == file_id)
        .first()
    )

    if not file_record:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    require_file_permission(
        file_record,
        current_user,
        db,
        "editor"
    )

    file_record.filename = data.filename

    db.commit()
    db.refresh(file_record)

    return {
        "id": file_record.id,
        "filename": file_record.filename,
        "storage_path": file_record.storage_path
    }


@router.patch("/{file_id}/move")
def move_file(
    file_id: int,
    folder_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_record = (
        db.query(File)
        .filter(File.id == file_id)
        .first()
    )

    if not file_record:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    require_file_permission(
        file_record,
        current_user,
        db,
        "editor"
    )

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
                detail="Destination folder not found"
            )

    file_record.folder_id = folder_id

    db.commit()
    db.refresh(file_record)

    return {
        "id": file_record.id,
        "filename": file_record.filename,
        "folder_id": file_record.folder_id,
        "storage_path": file_record.storage_path
    }


@router.delete("/{file_id}")
def delete_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
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

    if file_record.deleted_at is not None:
        raise HTTPException(
            status_code=400,
            detail="File already deleted"
        )

    file_record.deleted_at = datetime.utcnow()

    db.commit()

    return {
        "message": "File deleted successfully",
        "file_id": file_record.id
    }