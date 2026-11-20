"""
Application configuration.

Values are read from environment variables.
Copy .env.example to .env and fill in real values before running the app.
"""

import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    _raw_db_url: str = os.environ.get("DATABASE_URL", "")
    database_url: str = (
        _raw_db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
        if _raw_db_url.startswith("postgresql://")
        else _raw_db_url
    )

    jwt_secret_key: str = os.environ.get("JWT_SECRET_KEY", "")
    jwt_algorithm: str = os.environ.get("JWT_ALGORITHM", "HS256")
    jwt_access_token_expire_minutes: int = int(
        os.environ.get("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    )
    log_level: str = os.environ.get("LOG_LEVEL", "INFO")
    log_file: str = os.environ.get("LOG_FILE", "logs/app.log")
    log_to_console: bool = os.environ.get("LOG_TO_CONSOLE", "false").lower() in (
        "true",
        "1",
        "yes",
    )
    _raw_cors_origins: str = os.environ.get(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    )
    cors_origins: list[str] = [
        origin.strip()
        for origin in _raw_cors_origins.split(",")
        if origin.strip()
    ]


settings = Settings()
