import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.security import create_access_token, hash_password
from app.models.user import User


def create_test_user(session: Session, username: str) -> tuple[User, dict[str, str]]:
    """Helper to create a test user and return the User and auth headers."""
    user = User(username=username, password_hash=hash_password("test-password-123"))
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_access_token(subject=user.id)
    headers = {"Authorization": f"Bearer {token}"}
    return user, headers


# ---------------------------------------------------------------------------
# GET /users/lookup Tests
# ---------------------------------------------------------------------------


def test_lookup_existing_user_by_username(client: TestClient, session: Session):
    target, _ = create_test_user(session, "lookup_target")
    requester, req_headers = create_test_user(session, "lookup_requester")

    response = client.get(
        "/users/lookup",
        params={"username": "lookup_target"},
        headers=req_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == target.id
    assert data["username"] == "lookup_target"
    # Must NOT expose password_hash or any private field
    assert "password_hash" not in data


def test_lookup_self_is_allowed(client: TestClient, session: Session):
    user, headers = create_test_user(session, "self_lookup")

    response = client.get(
        "/users/lookup",
        params={"username": "self_lookup"},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["id"] == user.id
    assert response.json()["username"] == "self_lookup"


def test_lookup_nonexistent_user_returns_404(client: TestClient, session: Session):
    _, headers = create_test_user(session, "lookup_caller")

    response = client.get(
        "/users/lookup",
        params={"username": "this_user_does_not_exist_xyz"},
        headers=headers,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"


def test_lookup_requires_authentication(client: TestClient, session: Session):
    create_test_user(session, "unauth_target")

    response = client.get(
        "/users/lookup",
        params={"username": "unauth_target"},
    )

    assert response.status_code == 401


def test_lookup_username_is_case_sensitive(client: TestClient, session: Session):
    """Usernames must be an exact case-sensitive match (SQLite LIKE is case-insensitive
    for ASCII, but we use an equality check so case must match exactly)."""
    create_test_user(session, "CaseSensitiveUser")
    _, headers = create_test_user(session, "case_caller")

    # Exact match succeeds
    response_exact = client.get(
        "/users/lookup",
        params={"username": "CaseSensitiveUser"},
        headers=headers,
    )
    assert response_exact.status_code == 200

    # Wrong-case query returns 404
    response_wrong = client.get(
        "/users/lookup",
        params={"username": "casesensitiveuser"},
        headers=headers,
    )
    assert response_wrong.status_code == 404


def test_lookup_empty_username_query_rejected(client: TestClient, session: Session):
    """An empty username string must be rejected with a 422 Unprocessable Entity."""
    _, headers = create_test_user(session, "empty_caller")

    response = client.get(
        "/users/lookup",
        params={"username": ""},
        headers=headers,
    )

    # FastAPI Query(min_length=1) triggers a 422 validation error
    assert response.status_code == 422
