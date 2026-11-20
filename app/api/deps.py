import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from app.core.security import decode_access_token
from app.db.session import get_session
from app.models.user import User
from app.utils.logging import get_logger

logger = get_logger("auth")

security_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    session: Session = Depends(get_session),
) -> User:
    """
    Dependency that extracts, decodes, and validates the incoming Bearer JWT,
    then retrieves and returns the authenticated User from the database.
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        logger.debug("Authentication failed: missing or invalid credentials header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        subject = payload.get("sub")
        if subject is None:
            logger.warning("Authentication failed: missing subject claim in token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject claim",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id = int(subject)
    except jwt.ExpiredSignatureError:
        logger.warning("Authentication failed: token has expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (jwt.InvalidTokenError, ValueError):
        logger.warning("Authentication failed: invalid authentication token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = session.get(User, user_id)
    if user is None:
        logger.warning("Authentication failed: user not found user_id=%s", user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
