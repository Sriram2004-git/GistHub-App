from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

from app.core.config import settings

# Initialize pwdlib PasswordHash with Argon2
_password_hash = PasswordHash((Argon2Hasher(),))


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2."""
    return _password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against an Argon2 hash."""
    return _password_hash.verify(plain_password, hashed_password)


def create_access_token(subject: int | str, expires_delta: timedelta | None = None) -> str:
    """Generate a signed stateless JWT containing the subject claim and expiration."""
    if not settings.jwt_secret_key:
        raise ValueError("JWT_SECRET_KEY is not configured in application settings.")

    now = datetime.now(timezone.utc)
    if expires_delta is not None:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.jwt_access_token_expire_minutes)

    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }

    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and verify a signed JWT.
    Raises jwt.ExpiredSignatureError, jwt.InvalidTokenError, or ValueError if invalid.
    """
    if not settings.jwt_secret_key:
        raise ValueError("JWT_SECRET_KEY is not configured in application settings.")

    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
    )
