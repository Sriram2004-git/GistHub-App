from datetime import timedelta
import pytest
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.models.user import User


# ---------------------------------------------------------------------------
# Password security tests
# ---------------------------------------------------------------------------

def test_password_hashing_and_verification():
    raw_password = "SecurePassword123!"
    hashed = hash_password(raw_password)

    assert hashed != raw_password
    assert hashed.startswith("$argon2")
    assert verify_password(raw_password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


# ---------------------------------------------------------------------------
# Registration endpoint tests
# ---------------------------------------------------------------------------

def test_registration_success(client: TestClient, session: Session):
    response = client.post(
        "/auth/register",
        json={"username": "alice", "password": "alice-secure-password"},
    )
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["username"] == "alice"
    assert "password" not in data
    assert "password_hash" not in data

    # Verify user in database
    db_user = session.exec(select(User).where(User.username == "alice")).first()
    assert db_user is not None
    assert db_user.username == "alice"
    assert db_user.password_hash != "alice-secure-password"
    assert verify_password("alice-secure-password", db_user.password_hash) is True


def test_registration_duplicate_username_rejected(client: TestClient):
    payload = {"username": "bob", "password": "bob-password-123"}
    res1 = client.post("/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/auth/register", json=payload)
    assert res2.status_code in (400, 409)
    assert "already registered" in res2.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Login endpoint tests
# ---------------------------------------------------------------------------

def test_login_success(client: TestClient):
    # Register user first
    client.post(
        "/auth/register",
        json={"username": "charlie", "password": "charlie-secret-password"},
    )

    # Login
    response = client.post(
        "/auth/login",
        json={"username": "charlie", "password": "charlie-secret-password"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"].lower() == "bearer"
    assert "password" not in data
    assert "password_hash" not in data


def test_login_wrong_password_rejected(client: TestClient):
    client.post(
        "/auth/register",
        json={"username": "dave", "password": "correct-password"},
    )

    response = client.post(
        "/auth/login",
        json={"username": "dave", "password": "wrong-password"},
    )
    assert response.status_code == 401
    assert "Invalid username or password" in response.json()["detail"]


def test_login_unknown_user_rejected(client: TestClient):
    response = client.post(
        "/auth/login",
        json={"username": "nonexistent_user", "password": "some-password"},
    )
    assert response.status_code == 401
    assert "Invalid username or password" in response.json()["detail"]


# ---------------------------------------------------------------------------
# JWT creation, expiration, and verification dependency tests
# ---------------------------------------------------------------------------

def test_jwt_token_decoding():
    token = create_access_token(subject=42)
    payload = decode_access_token(token)
    assert payload["sub"] == "42"
    assert "exp" in payload
    assert "iat" in payload


def test_jwt_expiration_rejected():
    # Create an already expired token
    expired_token = create_access_token(subject=42, expires_delta=timedelta(seconds=-10))
    with pytest.raises(Exception):
        decode_access_token(expired_token)


def test_get_current_user_dependency_valid_token(session: Session):
    user = User(username="eve", password_hash=hash_password("eve-password"))
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_access_token(subject=user.id)
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    resolved_user = get_current_user(credentials=credentials, session=session)
    assert resolved_user.id == user.id
    assert resolved_user.username == "eve"


def test_get_current_user_dependency_expired_token(session: Session):
    user = User(username="frank", password_hash=hash_password("frank-password"))
    session.add(user)
    session.commit()
    session.refresh(user)

    expired_token = create_access_token(subject=user.id, expires_delta=timedelta(seconds=-5))
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=expired_token)

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=credentials, session=session)
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert "expired" in exc_info.value.detail.lower()


def test_get_current_user_dependency_invalid_token(session: Session):
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid.token.here")
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=credentials, session=session)
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert "invalid" in exc_info.value.detail.lower()


def test_get_current_user_dependency_missing_credentials(session: Session):
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=None, session=session)
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_current_user_dependency_nonexistent_user(session: Session):
    token = create_access_token(subject=99999)
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=credentials, session=session)
    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert "user not found" in exc_info.value.detail.lower()


def test_protected_endpoint_http_integration(client: TestClient):
    # Dynamically mount a test-only protected route for HTTP integration verification
    test_app = client.app
    
    @test_app.get("/test/protected-profile")
    def protected_profile(current_user: User = Depends(get_current_user)):
        return {"id": current_user.id, "username": current_user.username}

    # 1. Register & Login
    client.post("/auth/register", json={"username": "helen", "password": "helen-password"})
    login_resp = client.post("/auth/login", json={"username": "helen", "password": "helen-password"})
    token = login_resp.json()["access_token"]

    # 2. Access with valid token
    auth_resp = client.get("/test/protected-profile", headers={"Authorization": f"Bearer {token}"})
    assert auth_resp.status_code == 200
    assert auth_resp.json()["username"] == "helen"

    # 3. Access without token
    no_auth_resp = client.get("/test/protected-profile")
    assert no_auth_resp.status_code == 401

    # 4. Access with invalid token
    bad_auth_resp = client.get("/test/protected-profile", headers={"Authorization": "Bearer bad.token.here"})
    assert bad_auth_resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /auth/me endpoint tests
# ---------------------------------------------------------------------------

def test_auth_me_authenticated_user_success(client: TestClient):
    client.post("/auth/register", json={"username": "grace", "password": "grace-password-123"})
    login_resp = client.post("/auth/login", json={"username": "grace", "password": "grace-password-123"})
    token = login_resp.json()["access_token"]

    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["username"] == "grace"
    assert "password" not in data
    assert "password_hash" not in data


def test_auth_me_missing_token_rejected(client: TestClient):
    response = client.get("/auth/me")
    assert response.status_code == 401
    assert "detail" in response.json()


def test_auth_me_invalid_token_rejected(client: TestClient):
    response = client.get("/auth/me", headers={"Authorization": "Bearer not-a-valid-jwt"})
    assert response.status_code == 401


def test_auth_me_expired_token_rejected(client: TestClient):
    expired_token = create_access_token(subject=1, expires_delta=timedelta(seconds=-10))
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


def test_auth_me_nonexistent_user_rejected(client: TestClient):
    ghost_token = create_access_token(subject=999999)
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {ghost_token}"})
    assert response.status_code == 401
    assert "user not found" in response.json()["detail"].lower()


def test_cors_headers_and_preflight(client: TestClient):
    # Preflight OPTIONS request
    preflight_response = client.options(
        "/auth/me",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization,Content-Type",
        },
    )
    assert preflight_response.status_code == 200
    assert preflight_response.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert "GET" in preflight_response.headers.get("access-control-allow-methods", "")

