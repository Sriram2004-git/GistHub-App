"""
app package.

Import the FastAPI application instance from here for ASGI servers and tests.
"""

from app.main import app

__all__ = ["app"]
