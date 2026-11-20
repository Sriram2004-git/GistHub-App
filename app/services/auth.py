from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.auth import UserLogin, UserRegister
from app.utils.logging import get_logger

logger = get_logger("auth")


def register_user(session: Session, user_in: UserRegister) -> User:
    """
    Register a new user after verifying username uniqueness and hashing the password with Argon2.
    """
    existing_user = session.exec(
        select(User).where(User.username == user_in.username)
    ).first()

    if existing_user is not None:
        logger.warning(
            "Registration failed: username already registered username=%s",
            user_in.username,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    user = User(
        username=user_in.username,
        password_hash=hash_password(user_in.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    logger.info(
        "User registered successfully user_id=%s username=%s",
        user.id,
        user.username,
    )
    return user


def authenticate_user(session: Session, user_in: UserLogin) -> User | None:
    """
    Authenticate a user by username and password.
    Returns the User if valid, otherwise None.
    """
    user = session.exec(
        select(User).where(User.username == user_in.username)
    ).first()

    if user is None:
        logger.warning(
            "Authentication failed: user not found username=%s",
            user_in.username,
        )
        return None

    if not verify_password(user_in.password, user.password_hash):
        logger.warning(
            "Authentication failed: invalid password username=%s",
            user_in.username,
        )
        return None

    logger.info(
        "User authenticated successfully user_id=%s username=%s",
        user.id,
        user.username,
    )
    return user
