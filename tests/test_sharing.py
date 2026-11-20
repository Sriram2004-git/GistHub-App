import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.security import create_access_token, hash_password
from app.models.gist import Gist
from app.models.gist_share import GistShare
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
# Gist Sharing Endpoint Tests
# ---------------------------------------------------------------------------


def test_owner_can_share_gist_with_existing_user(
    client: TestClient, session: Session
):
    owner, owner_headers = create_test_user(session, "share_owner")
    recipient, _ = create_test_user(session, "share_recipient")

    # Create a gist
    create_res = client.post(
        "/gists",
        json={"title": "shareable.py", "content": "print('shared')"},
        headers=owner_headers,
    )
    assert create_res.status_code == 201
    gist_id = create_res.json()["id"]

    # Share with recipient
    share_res = client.post(
        f"/gists/{gist_id}/share",
        json={"recipient_id": recipient.id},
        headers=owner_headers,
    )
    assert share_res.status_code == 201
    data = share_res.json()
    assert data["gist_id"] == gist_id
    assert data["recipient_id"] == recipient.id
    assert "id" in data

    # Verify Gist.owner_id is unchanged
    db_gist = session.get(Gist, gist_id)
    assert db_gist.owner_id == owner.id

    # Verify GistShare in database
    db_share = session.get(GistShare, data["id"])
    assert db_share is not None
    assert db_share.gist_id == gist_id
    assert db_share.recipient_id == recipient.id


def test_non_owner_cannot_share_gist(client: TestClient, session: Session):
    owner, owner_headers = create_test_user(session, "owner_1")
    recipient, _ = create_test_user(session, "recipient_1")
    other_user, other_headers = create_test_user(session, "other_user_1")

    create_res = client.post(
        "/gists",
        json={"title": "private.py", "content": "top secret"},
        headers=owner_headers,
    )
    gist_id = create_res.json()["id"]

    # Non-owner attempts to share
    share_res = client.post(
        f"/gists/{gist_id}/share",
        json={"recipient_id": recipient.id},
        headers=other_headers,
    )
    assert share_res.status_code == 403
    assert share_res.json()["detail"] == "Not authorized to share this gist"


def test_sharing_with_nonexistent_recipient_rejected(
    client: TestClient, session: Session
):
    _, owner_headers = create_test_user(session, "owner_2")

    create_res = client.post(
        "/gists",
        json={"title": "test.py", "content": "test"},
        headers=owner_headers,
    )
    gist_id = create_res.json()["id"]

    share_res = client.post(
        f"/gists/{gist_id}/share",
        json={"recipient_id": 999999},
        headers=owner_headers,
    )
    assert share_res.status_code == 404
    assert share_res.json()["detail"] == "Recipient user not found"


def test_sharing_nonexistent_gist_rejected(
    client: TestClient, session: Session
):
    _, owner_headers = create_test_user(session, "owner_3")
    recipient, _ = create_test_user(session, "recipient_3")

    share_res = client.post(
        "/gists/999999/share",
        json={"recipient_id": recipient.id},
        headers=owner_headers,
    )
    assert share_res.status_code == 404
    assert share_res.json()["detail"] == "Gist not found"


def test_self_sharing_rejected(client: TestClient, session: Session):
    owner, owner_headers = create_test_user(session, "self_sharer")

    create_res = client.post(
        "/gists",
        json={"title": "self.py", "content": "self"},
        headers=owner_headers,
    )
    gist_id = create_res.json()["id"]

    share_res = client.post(
        f"/gists/{gist_id}/share",
        json={"recipient_id": owner.id},
        headers=owner_headers,
    )
    assert share_res.status_code == 400
    assert share_res.json()["detail"] == "Cannot share gist with yourself"


def test_duplicate_sharing_prevented(client: TestClient, session: Session):
    _, owner_headers = create_test_user(session, "owner_dup")
    recipient, _ = create_test_user(session, "recipient_dup")

    create_res = client.post(
        "/gists",
        json={"title": "dup.py", "content": "content"},
        headers=owner_headers,
    )
    gist_id = create_res.json()["id"]

    # First share succeeds
    share_res1 = client.post(
        f"/gists/{gist_id}/share",
        json={"recipient_id": recipient.id},
        headers=owner_headers,
    )
    assert share_res1.status_code == 201

    # Second share with same recipient must be rejected
    share_res2 = client.post(
        f"/gists/{gist_id}/share",
        json={"recipient_id": recipient.id},
        headers=owner_headers,
    )
    assert share_res2.status_code == 400
    assert share_res2.json()["detail"] == "Gist is already shared with this user"


# ---------------------------------------------------------------------------
# Recipient Feed Tests (GET /gists/shared)
# ---------------------------------------------------------------------------


def test_recipient_can_see_shared_gist_in_feed(
    client: TestClient, session: Session
):
    owner, owner_headers = create_test_user(session, "feed_owner")
    recipient, recipient_headers = create_test_user(session, "feed_recipient")
    _, unrelated_headers = create_test_user(session, "feed_unrelated")

    # Create 2 gists by owner
    c1 = client.post(
        "/gists",
        json={"title": "shared_feed_1.py", "content": "code1"},
        headers=owner_headers,
    )
    g1_id = c1.json()["id"]

    client.post(
        "/gists",
        json={"title": "unshared_feed_2.py", "content": "code2"},
        headers=owner_headers,
    )

    # Share only g1 with recipient
    client.post(
        f"/gists/{g1_id}/share",
        json={"recipient_id": recipient.id},
        headers=owner_headers,
    )

    # Recipient sees shared gist in feed
    feed_res = client.get("/gists/shared", headers=recipient_headers)
    assert feed_res.status_code == 200
    feed_data = feed_res.json()
    assert len(feed_data) == 1
    assert feed_data[0]["id"] == g1_id
    assert feed_data[0]["title"] == "shared_feed_1.py"
    assert feed_data[0]["owner_id"] == owner.id

    # Unrelated user sees empty shared feed
    unrelated_res = client.get("/gists/shared", headers=unrelated_headers)
    assert unrelated_res.status_code == 200
    assert len(unrelated_res.json()) == 0


def test_unauthenticated_shared_feed_rejected(client: TestClient):
    response = client.get("/gists/shared")
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Shared Gist Specific Read Access Tests (GET /gists/{gist_id})
# ---------------------------------------------------------------------------


def test_shared_gist_read_access(client: TestClient, session: Session):
    owner, owner_headers = create_test_user(session, "read_owner")
    recipient, recipient_headers = create_test_user(session, "read_recipient")
    _, unrelated_headers = create_test_user(session, "read_unrelated")

    create_res = client.post(
        "/gists",
        json={"title": "read_test.py", "content": "content_read"},
        headers=owner_headers,
    )
    gist_id = create_res.json()["id"]

    # Before sharing: unrelated and recipient cannot read
    res_before_rec = client.get(f"/gists/{gist_id}", headers=recipient_headers)
    assert res_before_rec.status_code == 403

    # Share with recipient
    client.post(
        f"/gists/{gist_id}/share",
        json={"recipient_id": recipient.id},
        headers=owner_headers,
    )

    # 1. Owner can read
    res_owner = client.get(f"/gists/{gist_id}", headers=owner_headers)
    assert res_owner.status_code == 200
    assert res_owner.json()["id"] == gist_id

    # 2. Recipient can read
    res_rec = client.get(f"/gists/{gist_id}", headers=recipient_headers)
    assert res_rec.status_code == 200
    assert res_rec.json()["id"] == gist_id
    assert res_rec.json()["title"] == "read_test.py"
    assert res_rec.json()["content"] == "content_read"
    assert res_rec.json()["owner_id"] == owner.id

    # 3. Unrelated authenticated user cannot read
    res_unrelated = client.get(f"/gists/{gist_id}", headers=unrelated_headers)
    assert res_unrelated.status_code == 403
    assert res_unrelated.json()["detail"] == "Not authorized to access this gist"

    # 4. Unauthenticated user cannot read
    res_unauth = client.get(f"/gists/{gist_id}")
    assert res_unauth.status_code == 401


# ---------------------------------------------------------------------------
# Read-Only Enforcement for Recipient (PUT & DELETE)
# ---------------------------------------------------------------------------


def test_recipient_cannot_update_shared_gist(client: TestClient, session: Session):
    owner, owner_headers = create_test_user(session, "mut_owner")
    recipient, recipient_headers = create_test_user(session, "mut_recipient")

    create_res = client.post(
        "/gists",
        json={"title": "immutable.py", "content": "original"},
        headers=owner_headers,
    )
    gist_id = create_res.json()["id"]

    client.post(
        f"/gists/{gist_id}/share",
        json={"recipient_id": recipient.id},
        headers=owner_headers,
    )

    # Recipient attempts update
    update_res = client.put(
        f"/gists/{gist_id}",
        json={"title": "modified_by_recipient.py"},
        headers=recipient_headers,
    )
    assert update_res.status_code == 403
    assert update_res.json()["detail"] == "Not authorized to modify this gist"

    # Verify unchanged in DB
    db_gist = session.get(Gist, gist_id)
    assert db_gist.title == "immutable.py"
    assert db_gist.owner_id == owner.id

    # Owner can still update
    owner_update = client.put(
        f"/gists/{gist_id}",
        json={"title": "updated_by_owner.py"},
        headers=owner_headers,
    )
    assert owner_update.status_code == 200
    assert owner_update.json()["title"] == "updated_by_owner.py"


def test_recipient_cannot_delete_shared_gist(client: TestClient, session: Session):
    owner, owner_headers = create_test_user(session, "del_share_owner")
    recipient, recipient_headers = create_test_user(session, "del_share_recipient")

    create_res = client.post(
        "/gists",
        json={"title": "nodelete.py", "content": "safe"},
        headers=owner_headers,
    )
    gist_id = create_res.json()["id"]

    client.post(
        f"/gists/{gist_id}/share",
        json={"recipient_id": recipient.id},
        headers=owner_headers,
    )

    # Recipient attempts delete
    del_res = client.delete(f"/gists/{gist_id}", headers=recipient_headers)
    assert del_res.status_code == 403
    assert del_res.json()["detail"] == "Not authorized to delete this gist"

    # Verify gist still exists
    db_gist = session.get(Gist, gist_id)
    assert db_gist is not None

    # Owner can delete gist and clean up shares
    owner_del = client.delete(f"/gists/{gist_id}", headers=owner_headers)
    assert owner_del.status_code == 204

    # Verify deleted
    assert session.get(Gist, gist_id) is None
    shares = session.exec(select(GistShare).where(GistShare.gist_id == gist_id)).all()
    assert len(shares) == 0


def test_unauthenticated_share_rejected(client: TestClient):
    response = client.post("/gists/1/share", json={"recipient_id": 2})
    assert response.status_code == 401
