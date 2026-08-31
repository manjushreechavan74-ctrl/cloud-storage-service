from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.file import File
from app.models.share import Share
from app.models.user import User


ROLE_LEVEL = {
    "viewer": 1,
    "editor": 2,
    "owner": 3,
}


def get_file_permission(
    file_record: File,
    current_user: User,
    db: Session,
) -> str | None:

    # Owner
    if file_record.user_id == current_user.id:
        return "owner"

    # Shared permission
    share = (
        db.query(Share)
        .filter(
            Share.file_id == file_record.id,
            Share.user_id == current_user.id,
        )
        .first()
    )

    if share:
        return share.role

    return None


def require_file_permission(
    file_record: File,
    current_user: User,
    db: Session,
    required_role: str,
):
    role = get_file_permission(
        file_record,
        current_user,
        db,
    )

    if role is None:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to access this file",
        )

    if ROLE_LEVEL.get(role, 0) < ROLE_LEVEL[required_role]:
        raise HTTPException(
            status_code=403,
            detail=f"{required_role.capitalize()} permission required",
        )

    return role