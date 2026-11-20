from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.api.deps import get_current_user
from app.core.security import create_access_token
from app.db.session import get_session
from app.models.user import User
from app.schemas.auth import Token, UserLogin, UserRegister, UserResponse
from app.services.auth import authenticate_user, register_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
def register(
    user_in: UserRegister,
    session: Session = Depends(get_session),
) -> UserResponse:
    """
    Register a new user account with unique username and hashed password.
    """
    return register_user(session=session, user_in=user_in)


@router.post(
    "/login",
    response_model=Token,
    status_code=status.HTTP_200_OK,
    summary="Log in user and return JWT",
)
def login(
    user_in: UserLogin,
    session: Session = Depends(get_session),
) -> Token:
    """
    Authenticate user credentials and return a signed stateless JWT.
    """
    user = authenticate_user(session=session, user_in=user_in)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(subject=user.id)
    return Token(access_token=access_token, token_type="bearer")


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current authenticated user profile",
)
def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """
    Return the profile of the currently authenticated user resolved from the JWT token.
    """
    return current_user
