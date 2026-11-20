"""
Smoke test: verify the FastAPI application can be imported and created.
"""

from fastapi import FastAPI

from app.main import app


def test_app_is_fastapi_instance():
    assert isinstance(app, FastAPI)


def test_app_has_title():
    assert app.title == "Gist API"


def test_app_routes_registered():
    openapi_schema = app.openapi()
    paths = openapi_schema.get("paths", {})
    assert "/auth/register" in paths
    assert "/auth/login" in paths
    assert "/auth/me" in paths
    assert "/gists" in paths
    assert "/gists/shared" in paths
    assert "/gists/{gist_id}" in paths
    assert "/gists/{gist_id}/share" in paths

    # Verify HTTP methods on /gists
    assert "post" in paths["/gists"]
    assert "get" in paths["/gists"]

    # Verify HTTP methods on /gists/shared
    assert "get" in paths["/gists/shared"]

    # Verify HTTP methods on /gists/{gist_id}
    assert "get" in paths["/gists/{gist_id}"]
    assert "put" in paths["/gists/{gist_id}"]
    assert "delete" in paths["/gists/{gist_id}"]

    # Verify HTTP methods on /gists/{gist_id}/share
    assert "post" in paths["/gists/{gist_id}/share"]
