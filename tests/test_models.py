"""
Database layer tests — verify models and metadata only.
No live database connection is required for these checks.
"""

from sqlmodel import SQLModel

from app.models import Gist, GistShare, User


def test_models_importable():
    assert User is not None
    assert Gist is not None
    assert GistShare is not None


def test_metadata_contains_users_table():
    assert "users" in SQLModel.metadata.tables


def test_metadata_contains_gists_table():
    assert "gists" in SQLModel.metadata.tables


def test_metadata_contains_gist_shares_table():
    assert "gist_shares" in SQLModel.metadata.tables


def test_gist_owner_id_foreign_key():
    gists_table = SQLModel.metadata.tables["gists"]
    fk_columns = {
        fk.target_fullname
        for col in gists_table.columns
        for fk in col.foreign_keys
    }
    assert "users.id" in fk_columns


def test_gist_share_foreign_keys():
    shares_table = SQLModel.metadata.tables["gist_shares"]
    fk_targets = {
        fk.target_fullname
        for col in shares_table.columns
        for fk in col.foreign_keys
    }
    assert "gists.id" in fk_targets
    assert "users.id" in fk_targets


def test_username_is_unique():
    users_table = SQLModel.metadata.tables["users"]
    username_col = users_table.c["username"]
    assert username_col.unique or any(
        set(uc.columns.keys()) == {"username"}
        for uc in users_table.constraints
        if hasattr(uc, "columns")
    )
