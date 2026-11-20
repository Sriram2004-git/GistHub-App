from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from app.api.deps import get_current_user
from app.db.session import get_session
from app.models.user import User
from app.schemas.gist import (
    GistCreate,
    GistRead,
    GistShareCreate,
    GistShareRead,
    GistUpdate,
)
from app.services.gist import (
    create_gist,
    delete_gist,
    get_gist_by_id,
    list_shared_gists,
    list_user_gists,
    share_gist,
    update_gist,
)

router = APIRouter(prefix="/gists", tags=["gists"])


@router.post(
    "",
    response_model=GistRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new gist",
)
def create(
    gist_in: GistCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> GistRead:
    """
    Create a new gist containing a title and content.
    The owner is automatically set to the authenticated user.
    """
    return create_gist(session=session, gist_in=gist_in, owner=current_user)


@router.get(
    "",
    response_model=list[GistRead],
    status_code=status.HTTP_200_OK,
    summary="List authenticated user's own gists",
)
def list_gists(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[GistRead]:
    """
    Retrieve all gists created by the currently authenticated user.
    """
    return list_user_gists(session=session, user=current_user)


@router.get(
    "/shared",
    response_model=list[GistRead],
    status_code=status.HTTP_200_OK,
    summary="List gists shared with authenticated user",
)
def list_shared(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[GistRead]:
    """
    Retrieve all gists that have been explicitly shared with the currently authenticated user.
    """
    return list_shared_gists(session=session, user=current_user)


@router.get(
    "/{gist_id}",
    response_model=GistRead,
    status_code=status.HTTP_200_OK,
    summary="Get a specific gist by ID",
)
def get_gist(
    gist_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> GistRead:
    """
    Retrieve details of a specific gist by its ID.
    Allowed for the gist owner or an authorized share recipient.
    """
    return get_gist_by_id(
        session=session, gist_id=gist_id, current_user=current_user
    )


@router.put(
    "/{gist_id}",
    response_model=GistRead,
    status_code=status.HTTP_200_OK,
    summary="Update a gist",
)
def update(
    gist_id: int,
    gist_in: GistUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> GistRead:
    """
    Update the title or content of a gist.
    Only the original creator of the gist is permitted to update it.
    """
    return update_gist(
        session=session,
        gist_id=gist_id,
        gist_in=gist_in,
        current_user=current_user,
    )


@router.delete(
    "/{gist_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a gist",
)
def delete(
    gist_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> None:
    """
    Permanently delete a gist.
    Only the original creator of the gist is permitted to delete it.
    """
    delete_gist(session=session, gist_id=gist_id, current_user=current_user)


@router.post(
    "/{gist_id}/share",
    response_model=GistShareRead,
    status_code=status.HTTP_201_CREATED,
    summary="Share a gist with another user",
)
def share(
    gist_id: int,
    share_in: GistShareCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> GistShareRead:
    """
    Share a gist with another user by recipient ID.
    Only the original creator of the gist can share it.
    """
    return share_gist(
        session=session,
        gist_id=gist_id,
        share_in=share_in,
        current_user=current_user,
    )
