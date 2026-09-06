from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.star import Star
from app.core.dependencies import get_current_user
from app.models.file import File


router = APIRouter(
    prefix="/stars",
    tags=["Stars"]
)


# =========================================================
# GET STARRED FILES
# =========================================================

@router.get("")
def get_starred_files(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    stars = (
        db.query(Star)
        .filter(Star.user_id == current_user.id)
        .all()
    )

    files = []

    for star in stars:
        file = (
            db.query(File)
            .filter(File.id == star.file_id)
            .first()
        )

        if file:
            files.append(file)

    return files


# =========================================================
# STAR FILE
# =========================================================

@router.post("/{file_id}")
def star_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    file = (
        db.query(File)
        .filter(File.id == file_id)
        .first()
    )

    if not file:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    existing_star = (
        db.query(Star)
        .filter(
            Star.user_id == current_user.id,
            Star.file_id == file_id
        )
        .first()
    )

    if existing_star:
        return {
            "message": "File already starred",
            "starred": True
        }

    new_star = Star(
        user_id=current_user.id,
        file_id=file_id
    )

    db.add(new_star)
    db.commit()

    return {
        "message": "File starred successfully",
        "starred": True
    }


# =========================================================
# UNSTAR FILE
# =========================================================

@router.delete("/{file_id}")
def unstar_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    star = (
        db.query(Star)
        .filter(
            Star.user_id == current_user.id,
            Star.file_id == file_id
        )
        .first()
    )

    if not star:
        raise HTTPException(
            status_code=404,
            detail="File is not starred"
        )

    db.delete(star)
    db.commit()

    return {
        "message": "File unstarred successfully",
        "starred": False
    }