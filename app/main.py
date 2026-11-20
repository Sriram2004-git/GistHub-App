from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth import router as auth_router
from app.api.routes.gists import router as gists_router
from app.api.routes.users import router as users_router
from app.core.config import settings
from app.utils.logging import setup_logging

# Initialize application logging configuration
setup_logging()

app = FastAPI(
    title="Gist API",
    description=(
        "A backend service for creating, managing, and sharing code/text gists. "
        "Provides JWT-authenticated endpoints for user-owned gist CRUD and gist sharing."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth_router)
app.include_router(gists_router)
app.include_router(users_router)
