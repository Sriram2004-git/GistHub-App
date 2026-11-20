import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.security import create_access_token, hash_password
from app.models.gist import Gist
from app.models.user import User


def create_test_user(session: Session, username: str) -> tuple[User, dict[str, str]]:
    """Helper to create a test user in DB and return the User and auth headers."""
    user = User(username=username, password_hash=hash_password("test-password-123"))
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_access_token(subject=user.id)
    headers = {"Authorization": f"Bearer {token}"}
    return user, headers


# ---------------------------------------------------------------------------
# Create Gist Tests
# ---------------------------------------------------------------------------


def test_authenticated_user_can_create_gist(client: TestClient, session: Session):
    user, headers = create_test_user(session, "alice")

    payload = {
        "title": "hello.py",
        "content": "print('Hello World')",
    }
    response = client.post("/gists", json=payload, headers=headers)

    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "hello.py"
    assert data["content"] == "print('Hello World')"
    assert data["owner_id"] == user.id
    assert "id" in data
    assert isinstance(data["id"], int)

    # Verify in DB
    db_gist = session.get(Gist, data["id"])
    assert db_gist is not None
    assert db_gist.title == "hello.py"
    assert db_gist.content == "print('Hello World')"
    assert db_gist.owner_id == user.id


def test_create_gist_cannot_override_owner(client: TestClient, session: Session):
    user, headers = create_test_user(session, "bob")

    # Attempt to supply an arbitrary owner_id in request body
    payload = {
        "title": "sample.py",
        "content": "x = 10",
        "owner_id": 99999,
    }
    response = client.post("/gists", json=payload, headers=headers)

    assert response.status_code == 201
    data = response.json()
    # The owner must strictly be the authenticated user
    assert data["owner_id"] == user.id
    assert data["owner_id"] != 99999


# ---------------------------------------------------------------------------
# Read Gist Tests
# ---------------------------------------------------------------------------


def test_list_user_own_gists_only(client: TestClient, session: Session):
    user1, headers1 = create_test_user(session, "user1")
    user2, headers2 = create_test_user(session, "user2")

    # Create 2 gists for user1
    client.post(
        "/gists",
        json={"title": "u1_gist1.py", "content": "print('1')"},
        headers=headers1,
    )
    client.post(
        "/gists",
        json={"title": "u1_gist2.py", "content": "print('2')"},
        headers=headers1,
    )

    # Create 1 gist for user2
    client.post(
        "/gists",
        json={"title": "u2_gist1.py", "content": "print('3')"},
        headers=headers2,
    )

    # User 1 list
    res1 = client.get("/gists", headers=headers1)
    assert res1.status_code == 200
    gists1 = res1.json()
    assert len(gists1) == 2
    assert all(g["owner_id"] == user1.id for g in gists1)
    titles1 = {g["title"] for g in gists1}
    assert titles1 == {"u1_gist1.py", "u1_gist2.py"}

    # User 2 list
    res2 = client.get("/gists", headers=headers2)
    assert res2.status_code == 200
    gists2 = res2.json()
    assert len(gists2) == 1
    assert gists2[0]["owner_id"] == user2.id
    assert gists2[0]["title"] == "u2_gist1.py"


def test_get_specific_gist_by_id(client: TestClient, session: Session):
    _, headers = create_test_user(session, "charlie")

    create_res = client.post(
        "/gists",
        json={"title": "specific.txt", "content": "details here"},
        headers=headers,
    )
    gist_id = create_res.json()["id"]

    get_res = client.get(f"/gists/{gist_id}", headers=headers)
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["id"] == gist_id
    assert data["title"] == "specific.txt"
    assert data["content"] == "details here"


def test_get_nonexistent_gist_returns_404(client: TestClient, session: Session):
    _, headers = create_test_user(session, "dave")

    response = client.get("/gists/999999", headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Gist not found"


# ---------------------------------------------------------------------------
# Update Gist Tests
# ---------------------------------------------------------------------------


def test_owner_can_update_title(client: TestClient, session: Session):
    _, headers = create_test_user(session, "eve")

    create_res = client.post(
        "/gists",
        json={"title": "old_title.py", "content": "same content"},
        headers=headers,
    )
    gist_id = create_res.json()["id"]

    update_res = client.put(
        f"/gists/{gist_id}",
        json={"title": "new_title.py"},
        headers=headers,
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["title"] == "new_title.py"
    assert data["content"] == "same content"


def test_owner_can_update_content(client: TestClient, session: Session):
    _, headers = create_test_user(session, "frank")

    create_res = client.post(
        "/gists",
        json={"title": "script.py", "content": "print('v1')"},
        headers=headers,
    )
    gist_id = create_res.json()["id"]

    update_res = client.put(
        f"/gists/{gist_id}",
        json={"content": "print('v2')"},
        headers=headers,
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["title"] == "script.py"
    assert data["content"] == "print('v2')"


def test_owner_can_update_both_title_and_content(
    client: TestClient, session: Session
):
    _, headers = create_test_user(session, "grace")

    create_res = client.post(
        "/gists",
        json={"title": "initial.py", "content": "initial content"},
        headers=headers,
    )
    gist_id = create_res.json()["id"]

    update_res = client.put(
        f"/gists/{gist_id}",
        json={"title": "final.py", "content": "final content"},
        headers=headers,
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["title"] == "final.py"
    assert data["content"] == "final content"


def test_non_owner_cannot_update_gist(client: TestClient, session: Session):
    user_owner, headers_owner = create_test_user(session, "owner_user")
    _, headers_other = create_test_user(session, "other_user")

    create_res = client.post(
        "/gists",
        json={"title": "protected.py", "content": "original code"},
        headers=headers_owner,
    )
    gist_id = create_res.json()["id"]

    # Non-owner attempts to update
    update_res = client.put(
        f"/gists/{gist_id}",
        json={"title": "hacked.py", "content": "malicious code"},
        headers=headers_other,
    )
    assert update_res.status_code == 403
    assert update_res.json()["detail"] == "Not authorized to modify this gist"

    # Verify gist in DB was not altered
    db_gist = session.get(Gist, gist_id)
    assert db_gist.title == "protected.py"
    assert db_gist.content == "original code"
    assert db_gist.owner_id == user_owner.id


def test_update_cannot_change_owner_id(client: TestClient, session: Session):
    user, headers = create_test_user(session, "heidi")

    create_res = client.post(
        "/gists",
        json={"title": "mine.py", "content": "my code"},
        headers=headers,
    )
    gist_id = create_res.json()["id"]

    # Attempt to change owner_id via update payload
    update_res = client.put(
        f"/gists/{gist_id}",
        json={"title": "updated_mine.py", "owner_id": 99999},
        headers=headers,
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["owner_id"] == user.id
    assert data["owner_id"] != 99999

    db_gist = session.get(Gist, gist_id)
    assert db_gist.owner_id == user.id


def test_update_nonexistent_gist_returns_404(
    client: TestClient, session: Session
):
    _, headers = create_test_user(session, "ivan")

    response = client.put(
        "/gists/999999",
        json={"title": "ghost.py", "content": "ghost"},
        headers=headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Gist not found"


# ---------------------------------------------------------------------------
# Delete Gist Tests
# ---------------------------------------------------------------------------


def test_owner_can_delete_gist(client: TestClient, session: Session):
    _, headers = create_test_user(session, "judy")

    create_res = client.post(
        "/gists",
        json={"title": "to_delete.py", "content": "delete me"},
        headers=headers,
    )
    gist_id = create_res.json()["id"]

    # Delete
    delete_res = client.delete(f"/gists/{gist_id}", headers=headers)
    assert delete_res.status_code == 204

    # Verify no longer retrievable via API
    get_res = client.get(f"/gists/{gist_id}", headers=headers)
    assert get_res.status_code == 404

    # Verify removed from database
    db_gist = session.get(Gist, gist_id)
    assert db_gist is None


def test_non_owner_cannot_delete_gist(client: TestClient, session: Session):
    user_owner, headers_owner = create_test_user(session, "del_owner")
    _, headers_other = create_test_user(session, "del_other")

    create_res = client.post(
        "/gists",
        json={"title": "cant_delete.py", "content": "safe code"},
        headers=headers_owner,
    )
    gist_id = create_res.json()["id"]

    # Non-owner attempts delete
    delete_res = client.delete(f"/gists/{gist_id}", headers=headers_other)
    assert delete_res.status_code == 403
    assert delete_res.json()["detail"] == "Not authorized to delete this gist"

    # Verify gist still exists in DB
    db_gist = session.get(Gist, gist_id)
    assert db_gist is not None
    assert db_gist.owner_id == user_owner.id


def test_delete_nonexistent_gist_returns_404(
    client: TestClient, session: Session
):
    _, headers = create_test_user(session, "karl")

    response = client.delete("/gists/999999", headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Gist not found"


# ---------------------------------------------------------------------------
# Unauthenticated Access Tests
# ---------------------------------------------------------------------------


def test_unauthenticated_requests_are_rejected(client: TestClient):
    # Create
    res_create = client.post("/gists", json={"title": "t", "content": "c"})
    assert res_create.status_code == 401

    # List
    res_list = client.get("/gists")
    assert res_list.status_code == 401

    # Get specific
    res_get = client.get("/gists/1")
    assert res_get.status_code == 401

    # Update
    res_update = client.put("/gists/1", json={"title": "new"})
    assert res_update.status_code == 401

    # Delete
    res_delete = client.delete("/gists/1")
    assert res_delete.status_code == 401
