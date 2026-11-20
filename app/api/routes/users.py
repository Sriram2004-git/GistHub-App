from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.db.session import get_session
from app.models.user import User
from app.schemas.auth import UserResponse
from app.utils.logging import get_logger

router = APIRouter(prefix="/users", tags=["users"])
logger = get_logger("users")


@router.get(
    "/lookup",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Look up a user by exact username",
)
def lookup_user(
    username: str = Query(..., min_length=1, description="Exact username to look up"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> UserResponse:
    """
    Retrieve a user's public profile (id and username) by exact username match.

    - Requires authentication (the caller must supply a valid JWT).
    - Only the public fields (id, username) are returned — no password hashes or
      private data are ever exposed.
    - Self-lookup is permitted; the caller may resolve their own ID.
    - Used by the frontend Share modal to resolve a username to a numeric user ID
      before submitting a share request.
    """
    user = session.exec(select(User).where(User.username == username)).first()

    if user is None:
        logger.info(
            "User lookup: not found username=%s requester_id=%s",
            username,
            current_user.id,
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    logger.info(
        "User lookup: resolved username=%s to user_id=%s requester_id=%s",
        username,
        user.id,
        current_user.id,
    )
    return user
