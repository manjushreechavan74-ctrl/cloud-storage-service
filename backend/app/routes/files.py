import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.file_version import FileVersion

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
    delete_storage_file,
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


# =========================================================
# INIT UPLOAD
# =========================================================

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
        extension = "." + data.filename.rsplit(
            ".",
            1
        )[1]

    unique_name = f"{uuid.uuid4()}{extension}"

    storage_path = (
        f"{current_user.id}/{unique_name}"
    )

    storage = get_storage()

    try:
        upload_url_response = (
            storage.create_signed_upload_url(
                storage_path
            )
        )
    except Exception as error:
        print(
            f"Signed upload URL creation failed: {error}"
        )

        raise HTTPException(
            status_code=500,
            detail="Could not generate signed upload URL"
        )

    if isinstance(upload_url_response, dict):
        upload_url = (
            upload_url_response.get(
                "signedURL"
            )
            or upload_url_response.get(
                "signed_url"
            )
        )
    else:
        upload_url = (
            getattr(
                upload_url_response,
                "signedURL",
                None
            )
            or getattr(
                upload_url_response,
                "signed_url",
                None
            )
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


# =========================================================
# LIST FILES
# =========================================================

@router.get(
    "",
    response_model=list[FileResponse]
)
def list_files(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # -----------------------------------------------------
    # OWNED FILES
    # -----------------------------------------------------

    owned_files = (
        db.query(File)
        .filter(
            File.user_id == current_user.id,
            File.deleted_at.is_(None)
        )
        .all()
    )

    # -----------------------------------------------------
    # DIRECTLY SHARED FILES
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # FILES INSIDE SHARED FOLDERS
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # REMOVE DUPLICATES
    # -----------------------------------------------------

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


# =========================================================
# SEARCH FILES
# =========================================================

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
    # -----------------------------------------------------
    # OWNED FILES
    # -----------------------------------------------------

    owned_query = (
        db.query(File)
        .filter(
            File.user_id == current_user.id,
            File.deleted_at.is_(None)
        )
    )

    # -----------------------------------------------------
    # DIRECTLY SHARED FILES
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # FILES INSIDE SHARED FOLDERS
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # SEARCH BY FILENAME
    # -----------------------------------------------------

    if q:
        search_term = f"%{q}%"

        owned_query = owned_query.filter(
            File.filename.ilike(search_term)
        )

        shared_query = shared_query.filter(
            File.filename.ilike(search_term)
        )

        folder_shared_query = (
            folder_shared_query.filter(
                File.filename.ilike(search_term)
            )
        )

    # -----------------------------------------------------
    # CONTENT TYPE FILTER
    # -----------------------------------------------------

    if content_type:
        owned_query = owned_query.filter(
            File.content_type == content_type
        )

        shared_query = shared_query.filter(
            File.content_type == content_type
        )

        folder_shared_query = (
            folder_shared_query.filter(
                File.content_type == content_type
            )
        )

    owned_files = owned_query.all()
    shared_files = shared_query.all()
    folder_shared_files = (
        folder_shared_query.all()
    )

    # -----------------------------------------------------
    # REMOVE DUPLICATES
    # -----------------------------------------------------

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


# =========================================================
# LIST TRASH
# =========================================================

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
        .order_by(
            File.deleted_at.desc()
        )
        .all()
    )

    return trashed_files


# =========================================================
# RESTORE FILE
# =========================================================

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


# =========================================================
# DOWNLOAD FILE
# =========================================================

@router.get("/{file_id}/download")
def download_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_record = (
        db.query(File)
        .filter(
            File.id == file_id
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
            status_code=404,
            detail="File not found"
        )

    # -----------------------------------------------------
    # CHECK VIEW PERMISSION
    # -----------------------------------------------------

    require_file_permission(
        file_record,
        current_user,
        db,
        "viewer"
    )

    # -----------------------------------------------------
    # CREATE SIGNED DOWNLOAD URL
    # -----------------------------------------------------

    download_url = (
        create_signed_download_url(
            file_record.storage_path
        )
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


# =========================================================
# RENAME FILE
# =========================================================

@router.patch("/{file_id}/rename")
def rename_file(
    file_id: int,
    data: RenameFileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_record = (
        db.query(File)
        .filter(
            File.id == file_id
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


# =========================================================
# MOVE FILE
# =========================================================

@router.patch("/{file_id}/move")
def move_file(
    file_id: int,
    folder_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_record = (
        db.query(File)
        .filter(
            File.id == file_id
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
            status_code=404,
            detail="File not found"
        )

    require_file_permission(
        file_record,
        current_user,
        db,
        "editor"
    )

    # -----------------------------------------------------
    # CHECK DESTINATION FOLDER
    # -----------------------------------------------------

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


# =========================================================
# MOVE FILE TO TRASH
# =========================================================

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

    # -----------------------------------------------------
    # SOFT DELETE
    # -----------------------------------------------------

    file_record.deleted_at = datetime.utcnow()

    db.commit()

    return {
        "message": "File deleted successfully",
        "file_id": file_record.id
    }


# =========================================================
# PERMANENTLY DELETE FILE
# =========================================================

@router.delete("/{file_id}/permanent")
def permanently_delete_file(
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
            detail="File must be in trash before permanent deletion"
        )

    storage_path = file_record.storage_path

    # -----------------------------------------------------
    # REMOVE SHARES
    # -----------------------------------------------------

    try:
        db.query(Share).filter(
            Share.file_id == file_record.id
        ).delete(
            synchronize_session=False
        )

        db.flush()

    except Exception as error:
        db.rollback()

        print(
            f"Share deletion failed: {error}"
        )

        raise HTTPException(
            status_code=500,
            detail="Could not remove file shares"
        )

    # -----------------------------------------------------
    # REMOVE FILE FROM DATABASE
    # -----------------------------------------------------

    try:
        db.delete(file_record)
        db.commit()

    except Exception as error:
        db.rollback()

        print(
            f"File database deletion failed: {error}"
        )

        raise HTTPException(
            status_code=500,
            detail="Could not delete file from database"
        )

    # -----------------------------------------------------
    # REMOVE FILE FROM SUPABASE STORAGE
    # -----------------------------------------------------

    storage_deleted = delete_storage_file(
        storage_path
    )

    if not storage_deleted:
        print(
            f"WARNING: Database deleted file {file_id}, "
            f"but storage deletion failed for {storage_path}"
        )

        # Database is already successfully deleted.
        # Do not return 500 because the DB operation succeeded.
        return {
            "message": "File permanently deleted from database, but storage cleanup failed",
            "file_id": file_id
        }

    # -----------------------------------------------------
    # SUCCESS
    # -----------------------------------------------------

    return {
        "message": "File permanently deleted",
        "file_id": file_id
    }

# =========================================================
# VERSION HISTORY
# =========================================================

@router.get("/{file_id}/versions")
def list_file_versions(
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

    # User must have viewer access
    require_file_permission(
        file_record,
        current_user,
        db,
        "viewer"
    )

    versions = (
        db.query(FileVersion)
        .filter(
            FileVersion.file_id == file_id
        )
        .order_by(
            FileVersion.version_number.desc()
        )
        .all()
    )

    return versions


# =========================================================
# DOWNLOAD OLD VERSION
# =========================================================

@router.get("/{file_id}/versions/{version_id}/download")
def download_file_version(
    file_id: int,
    version_id: int,
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

    version = (
        db.query(FileVersion)
        .filter(
            FileVersion.id == version_id,
            FileVersion.file_id == file_id
        )
        .first()
    )

    if not version:
        raise HTTPException(
            status_code=404,
            detail="Version not found"
        )

    download_url = create_signed_download_url(
        version.storage_path
    )

    if not download_url:
        raise HTTPException(
            status_code=500,
            detail="Could not generate signed download URL"
        )

    return {
        "id": version.id,
        "file_id": version.file_id,
        "version_number": version.version_number,
        "filename": version.filename,
        "content_type": version.content_type,
        "size": version.size,
        "created_by": version.created_by,
        "created_at": version.created_at,
        "download_url": download_url
    }


# =========================================================
# RESTORE OLD VERSION
# =========================================================

@router.post("/{file_id}/versions/{version_id}/restore")
def restore_file_version(
    file_id: int,
    version_id: int,
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

    # Only editor/owner can restore
    require_file_permission(
        file_record,
        current_user,
        db,
        "editor"
    )

    version = (
        db.query(FileVersion)
        .filter(
            FileVersion.id == version_id,
            FileVersion.file_id == file_id
        )
        .first()
    )

    if not version:
        raise HTTPException(
            status_code=404,
            detail="Version not found"
        )

    # Save current version before replacing it
    latest_version = (
        db.query(FileVersion)
        .filter(
            FileVersion.file_id == file_id
        )
        .order_by(
            FileVersion.version_number.desc()
        )
        .first()
    )

    next_version_number = (
        latest_version.version_number + 1
        if latest_version
        else 1
    )

    current_version = FileVersion(
        file_id=file_record.id,
        version_number=next_version_number,
        storage_path=file_record.storage_path,
        filename=file_record.filename,
        content_type=file_record.content_type,
        size=file_record.size,
        created_by=current_user.id
    )

    db.add(current_version)

    # Restore selected version metadata/storage path
    file_record.storage_path = version.storage_path
    file_record.filename = version.filename
    file_record.content_type = version.content_type
    file_record.size = version.size

    db.commit()
    db.refresh(file_record)

    return {
        "message": "File version restored successfully",
        "file_id": file_record.id,
        "filename": file_record.filename,
        "version_id": version.id,
        "version_number": version.version_number
    }

# =========================================================
# INIT REPLACE UPLOAD
# =========================================================

@router.post("/{file_id}/replace/init-upload")
def init_replace_upload(
    file_id: int,
    data: InitUploadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # -----------------------------------------------------
    # FIND EXISTING FILE
    # -----------------------------------------------------

    file_record = (
        db.query(File)
        .filter(
            File.id == file_id,
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
    # CHECK EDITOR / OWNER PERMISSION
    # -----------------------------------------------------

    require_file_permission(
        file_record,
        current_user,
        db,
        "editor"
    )

    # -----------------------------------------------------
    # VALIDATE NEW FILE
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # CREATE NEW STORAGE PATH
    # -----------------------------------------------------

    extension = ""

    if "." in data.filename:
        extension = "." + data.filename.rsplit(".", 1)[1]

    unique_name = f"{uuid.uuid4()}{extension}"

    storage_path = (
        f"{current_user.id}/{unique_name}"
    )

    # -----------------------------------------------------
    # CREATE SIGNED UPLOAD URL
    # -----------------------------------------------------

    storage = get_storage()

    try:
        upload_url_response = (
            storage.create_signed_upload_url(
                storage_path
            )
        )
    except Exception as error:
        print(
            f"Signed replace upload URL creation failed: {error}"
        )

        raise HTTPException(
            status_code=500,
            detail="Could not generate signed upload URL"
        )

    if isinstance(upload_url_response, dict):
        upload_url = (
            upload_url_response.get("signedURL")
            or upload_url_response.get("signed_url")
        )
    else:
        upload_url = (
            getattr(
                upload_url_response,
                "signedURL",
                None
            )
            or getattr(
                upload_url_response,
                "signed_url",
                None
            )
        )

    if not upload_url:
        raise HTTPException(
            status_code=500,
            detail="Could not generate signed upload URL"
        )

    # -----------------------------------------------------
    # SAVE OLD CURRENT FILE AS A VERSION
    # -----------------------------------------------------

    latest_version = (
        db.query(FileVersion)
        .filter(
            FileVersion.file_id == file_record.id
        )
        .order_by(
            FileVersion.version_number.desc()
        )
        .first()
    )

    if latest_version:
        next_version_number = (
            latest_version.version_number + 1
        )
    else:
        next_version_number = 1

    old_version = FileVersion(
        file_id=file_record.id,
        version_number=next_version_number,
        storage_path=file_record.storage_path,
        filename=file_record.filename,
        content_type=file_record.content_type,
        size=file_record.size,
        created_by=current_user.id
    )

    db.add(old_version)

    # -----------------------------------------------------
    # UPDATE CURRENT FILE
    # -----------------------------------------------------

    file_record.filename = data.filename
    file_record.storage_path = storage_path
    file_record.content_type = data.content_type
    file_record.size = data.size

    db.commit()
    db.refresh(file_record)

    # -----------------------------------------------------
    # RETURN UPLOAD DETAILS
    # -----------------------------------------------------

    return {
        "file_id": file_record.id,
        "upload_url": upload_url,
        "storage_path": storage_path
    }