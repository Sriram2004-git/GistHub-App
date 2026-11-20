from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.models.gist import Gist
from app.models.gist_share import GistShare
from app.models.user import User
from app.schemas.gist import GistCreate, GistShareCreate, GistUpdate
from app.utils.logging import get_logger

logger = get_logger("gist")


def create_gist(session: Session, gist_in: GistCreate, owner: User) -> Gist:
    """
    Create a new gist owned by the authenticated user.
    """
    gist = Gist(
        title=gist_in.title,
        content=gist_in.content,
        owner_id=owner.id,
    )
    session.add(gist)
    session.commit()
    session.refresh(gist)
    logger.info("Gist created gist_id=%s owner_id=%s", gist.id, owner.id)
    return gist


def list_user_gists(session: Session, user: User) -> list[Gist]:
    """
    Retrieve all gists owned by the given user.
    """
    statement = select(Gist).where(Gist.owner_id == user.id)
    return list(session.exec(statement).all())


def list_shared_gists(session: Session, user: User) -> list[Gist]:
    """
    Retrieve all gists that have been shared with the given user.
    """
    statement = (
        select(Gist)
        .join(GistShare, Gist.id == GistShare.gist_id)
        .where(GistShare.recipient_id == user.id)
    )
    return list(session.exec(statement).all())


def get_gist_by_id(session: Session, gist_id: int, current_user: User) -> Gist:
    """
    Retrieve a specific gist by its ID if the current user is either
    the owner or an authorized share recipient.
    """
    gist = session.get(Gist, gist_id)
    if gist is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gist not found",
        )

    if gist.owner_id == current_user.id:
        return gist

    # Check if current user is an authorized share recipient
    share = session.exec(
        select(GistShare).where(
            GistShare.gist_id == gist_id,
            GistShare.recipient_id == current_user.id,
        )
    ).first()

    if share is not None:
        return gist

    logger.warning(
        "Unauthorized gist read attempt gist_id=%s user_id=%s",
        gist_id,
        current_user.id,
    )
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authorized to access this gist",
    )


def update_gist(
    session: Session,
    gist_id: int,
    gist_in: GistUpdate,
    current_user: User,
) -> Gist:
    """
    Update a gist's title or content, ensuring only the original owner can modify it.
    """
    gist = session.get(Gist, gist_id)
    if gist is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gist not found",
        )
    if gist.owner_id != current_user.id:
        logger.warning(
            "Unauthorized gist update attempt gist_id=%s user_id=%s",
            gist_id,
            current_user.id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this gist",
        )

    if gist_in.title is not None:
        gist.title = gist_in.title
    if gist_in.content is not None:
        gist.content = gist_in.content

    session.add(gist)
    session.commit()
    session.refresh(gist)
    logger.info("Gist updated gist_id=%s owner_id=%s", gist.id, current_user.id)
    return gist


def delete_gist(
    session: Session,
    gist_id: int,
    current_user: User,
) -> None:
    """
    Permanently delete a gist and any associated share records,
    ensuring only the original owner can delete it.
    """
    gist = session.get(Gist, gist_id)
    if gist is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gist not found",
        )
    if gist.owner_id != current_user.id:
        logger.warning(
            "Unauthorized gist delete attempt gist_id=%s user_id=%s",
            gist_id,
            current_user.id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this gist",
        )

    # Clean up any related shares to maintain database integrity
    shares = session.exec(
        select(GistShare).where(GistShare.gist_id == gist_id)
    ).all()
    for share in shares:
        session.delete(share)

    session.delete(gist)
    session.commit()
    logger.info("Gist deleted gist_id=%s owner_id=%s", gist.id, current_user.id)


def share_gist(
    session: Session,
    gist_id: int,
    share_in: GistShareCreate,
    current_user: User,
) -> GistShare:
    """
    Explicitly share a gist with another user by recipient user ID.
    Enforces that only the gist owner can share, recipient exists,
    self-sharing is rejected, and duplicate shares are prevented.
    """
    gist = session.get(Gist, gist_id)
    if gist is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Gist not found",
        )

    if gist.owner_id != current_user.id:
        logger.warning(
            "Unauthorized gist share attempt gist_id=%s user_id=%s",
            gist_id,
            current_user.id,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to share this gist",
        )

    if share_in.recipient_id == current_user.id:
        logger.warning(
            "Rejected self-share attempt gist_id=%s user_id=%s",
            gist_id,
            current_user.id,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot share gist with yourself",
        )

    recipient = session.get(User, share_in.recipient_id)
    if recipient is None:
        logger.warning(
            "Share failed: recipient not found gist_id=%s recipient_id=%s",
            gist_id,
            share_in.recipient_id,
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient user not found",
        )

    existing_share = session.exec(
        select(GistShare).where(
            GistShare.gist_id == gist_id,
            GistShare.recipient_id == share_in.recipient_id,
        )
    ).first()

    if existing_share is not None:
        logger.warning(
            "Rejected duplicate share attempt gist_id=%s recipient_id=%s",
            gist_id,
            share_in.recipient_id,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gist is already shared with this user",
        )

    share = GistShare(
        gist_id=gist_id,
        recipient_id=share_in.recipient_id,
    )
    session.add(share)
    session.commit()
    session.refresh(share)
    logger.info(
        "Gist shared gist_id=%s owner_id=%s recipient_id=%s",
        gist_id,
        current_user.id,
        share_in.recipient_id,
    )
    return share
