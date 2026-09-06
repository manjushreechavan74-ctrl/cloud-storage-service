from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import inspect, or_, text
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.core.storage import delete_storage_file

from app.models.user import User
from app.models.file import File
from app.models.file_version import FileVersion
from app.models.folder import Folder
from app.models.share import Share, LinkShare
from app.models.public_share import PublicShare

from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# =========================================================
# REGISTER
# =========================================================

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db)
):
    existing_user = (
        db.query(User)
        .filter(User.email == data.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password)
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


# =========================================================
# LOGIN
# =========================================================

@router.post(
    "/login",
    response_model=TokenResponse
)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(User.email == data.email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not verify_password(
        data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


# =========================================================
# CURRENT USER
# =========================================================

@router.get(
    "/me",
    response_model=UserResponse
)
def get_me(
    current_user: User = Depends(get_current_user)
):
    return current_user


# =========================================================
# DELETE ACCOUNT PERMANENTLY
# =========================================================

@router.delete("/me")
def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id
    storage_cleanup_errors = []

    # -----------------------------------------------------
    # 1. Get all files owned by the user
    # -----------------------------------------------------

    owned_files = (
        db.query(File)
        .filter(
            File.user_id == user_id
        )
        .all()
    )

    owned_file_ids = [
        file.id
        for file in owned_files
    ]

    # -----------------------------------------------------
    # 2. Get all folders owned by the user
    # -----------------------------------------------------

    owned_folders = (
        db.query(Folder)
        .filter(
            Folder.user_id == user_id
        )
        .all()
    )

    owned_folder_ids = [
        folder.id
        for folder in owned_folders
    ]

    # -----------------------------------------------------
    # 3. Collect storage paths
    #    - Current files
    #    - Previous versions
    # -----------------------------------------------------

    storage_paths = [
        file.storage_path
        for file in owned_files
        if file.storage_path
    ]

    if owned_file_ids:
        versions = (
            db.query(FileVersion)
            .filter(
                FileVersion.file_id.in_(owned_file_ids)
            )
            .all()
        )

        storage_paths.extend(
            version.storage_path
            for version in versions
            if version.storage_path
        )

    # Remove duplicate storage paths
    storage_paths = list(
        dict.fromkeys(storage_paths)
    )

    # -----------------------------------------------------
    # 4. Delete share records
    # -----------------------------------------------------

    if owned_file_ids:
        db.query(Share).filter(
            (Share.owner_id == user_id)
            | (Share.user_id == user_id)
            | Share.file_id.in_(owned_file_ids)
            | Share.folder_id.in_(owned_folder_ids or [-1])
        ).delete(
            synchronize_session=False
        )

    elif owned_folder_ids:
        db.query(Share).filter(
            (Share.owner_id == user_id)
            | (Share.user_id == user_id)
            | Share.folder_id.in_(owned_folder_ids)
        ).delete(
            synchronize_session=False
        )

    else:
        db.query(Share).filter(
            (Share.owner_id == user_id)
            | (Share.user_id == user_id)
        ).delete(
            synchronize_session=False
        )

    # -----------------------------------------------------
    # 5. Delete public shares
    # -----------------------------------------------------

    public_share_filters = [
        PublicShare.owner_id == user_id
    ]

    if owned_file_ids:
        public_share_filters.append(
            PublicShare.file_id.in_(owned_file_ids)
        )

    if owned_folder_ids:
        public_share_filters.append(
            PublicShare.folder_id.in_(owned_folder_ids)
        )

    db.query(PublicShare).filter(
        or_(*public_share_filters)
    ).delete(
        synchronize_session=False
    )

    # -----------------------------------------------------
    # 6. Delete link shares
    # -----------------------------------------------------

    link_share_filters = [
        LinkShare.owner_id == user_id
    ]

    if owned_file_ids:
        link_share_filters.append(
            LinkShare.file_id.in_(owned_file_ids)
        )

    if owned_folder_ids:
        link_share_filters.append(
            LinkShare.folder_id.in_(owned_folder_ids)
        )

    db.query(LinkShare).filter(
        or_(*link_share_filters)
    ).delete(
        synchronize_session=False
    )

    # -----------------------------------------------------
    # 7. Delete file versions
    #    This also handles versions created by this user
    #    on another user's file.
    # -----------------------------------------------------

    version_filters = [
        FileVersion.created_by == user_id
    ]

    if owned_file_ids:
        version_filters.append(
            FileVersion.file_id.in_(owned_file_ids)
        )

    db.query(FileVersion).filter(
        or_(*version_filters)
    ).delete(
        synchronize_session=False
    )

    # -----------------------------------------------------
    # 8. Remove files from owned folders if necessary
    # -----------------------------------------------------

    if owned_folder_ids:
        db.query(File).filter(
            File.folder_id.in_(owned_folder_ids),
            File.user_id != user_id
        ).update(
            {
                File.folder_id: None
            },
            synchronize_session=False
        )

    # -----------------------------------------------------
    # 9. Delete files owned by the user
    # -----------------------------------------------------

    if owned_file_ids:
        db.query(File).filter(
            File.id.in_(owned_file_ids)
        ).delete(
            synchronize_session=False
        )

    # -----------------------------------------------------
    # 10. Delete owned folders
    # -----------------------------------------------------
    # Clear parent_id first in case folders reference
    # other folders owned by the same account.

    if owned_folder_ids:

        db.query(Folder).filter(
            Folder.id.in_(owned_folder_ids)
        ).update(
            {
                Folder.parent_id: None
            },
            synchronize_session=False
        )

        db.query(Folder).filter(
            Folder.id.in_(owned_folder_ids)
        ).delete(
            synchronize_session=False
        )

    # -----------------------------------------------------
    # 11. Delete stars and activities
    #     only when those tables exist
    # -----------------------------------------------------

    try:
        inspector = inspect(db.bind)

        table_names = set(
            inspector.get_table_names()
        )

        # -------------------------------------------------
        # STARS
        # -------------------------------------------------

        if "stars" in table_names:

            star_columns = {
                column["name"]
                for column in inspector.get_columns("stars")
            }

            star_conditions = []

            star_params = {
                "user_id": user_id
            }

            if "user_id" in star_columns:
                star_conditions.append(
                    "user_id = :user_id"
                )

            if (
                owned_file_ids
                and "file_id" in star_columns
            ):
                placeholders = []

                for index, file_id in enumerate(
                    owned_file_ids
                ):
                    key = f"star_file_id_{index}"

                    placeholders.append(
                        f":{key}"
                    )

                    star_params[key] = file_id

                star_conditions.append(
                    "file_id IN ("
                    + ", ".join(placeholders)
                    + ")"
                )

            if star_conditions:
                db.execute(
                    text(
                        "DELETE FROM stars WHERE "
                        + " OR ".join(
                            star_conditions
                        )
                    ),
                    star_params
                )

        # -------------------------------------------------
        # ACTIVITIES
        # -------------------------------------------------

        if "activities" in table_names:

            activity_columns = {
                column["name"]
                for column in inspector.get_columns(
                    "activities"
                )
            }

            activity_conditions = []

            activity_params = {
                "user_id": user_id
            }

            if "user_id" in activity_columns:
                activity_conditions.append(
                    "user_id = :user_id"
                )

            if (
                owned_file_ids
                and "file_id" in activity_columns
            ):
                placeholders = []

                for index, file_id in enumerate(
                    owned_file_ids
                ):
                    key = f"activity_file_id_{index}"

                    placeholders.append(
                        f":{key}"
                    )

                    activity_params[key] = file_id

                activity_conditions.append(
                    "file_id IN ("
                    + ", ".join(placeholders)
                    + ")"
                )

            if (
                owned_folder_ids
                and "folder_id" in activity_columns
            ):
                placeholders = []

                for index, folder_id in enumerate(
                    owned_folder_ids
                ):
                    key = f"activity_folder_id_{index}"

                    placeholders.append(
                        f":{key}"
                    )

                    activity_params[key] = folder_id

                activity_conditions.append(
                    "folder_id IN ("
                    + ", ".join(placeholders)
                    + ")"
                )

            if activity_conditions:
                db.execute(
                    text(
                        "DELETE FROM activities WHERE "
                        + " OR ".join(
                            activity_conditions
                        )
                    ),
                    activity_params
                )

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Could not clean up account activity data"
        ) from error

    # -----------------------------------------------------
    # 12. Delete user account
    # -----------------------------------------------------

    try:
        db.delete(current_user)
        db.commit()

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Could not delete account"
        ) from error

    # -----------------------------------------------------
    # 13. Delete actual files from storage
    # -----------------------------------------------------

    for storage_path in storage_paths:

        try:
            deleted = delete_storage_file(
                storage_path
            )

            if not deleted:
                storage_cleanup_errors.append(
                    storage_path
                )

        except Exception as error:

            print(
                "Account storage cleanup failed "
                f"for {storage_path}: {error}"
            )

            storage_cleanup_errors.append(
                storage_path
            )

    # -----------------------------------------------------
    # 14. Success response
    # -----------------------------------------------------

    return {
        "message": "Account permanently deleted",
        "storage_cleanup_failed": bool(
            storage_cleanup_errors
        )
    }