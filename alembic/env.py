import os
from logging.config import fileConfig

from sqlalchemy import create_engine, pool

from alembic import context

# ---------------------------------------------------------------------------
# Alembic Config object — provides access to alembic.ini values.
# ---------------------------------------------------------------------------
config = context.config

# Configure Python logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ---------------------------------------------------------------------------
# Load .env so DATABASE_URL is available when running alembic commands
# directly from the shell (python-dotenv ships with uvicorn[standard]).
# ---------------------------------------------------------------------------
try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass  # dotenv is optional at migration time; DATABASE_URL must be set manually

# Read DATABASE_URL directly from the environment.
# We do NOT use config.set_main_option() because configparser interprets '%'
# as an interpolation marker, which breaks passwords that contain '%40' etc.
database_url = os.environ.get("DATABASE_URL", "")
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg2://", 1)

# ---------------------------------------------------------------------------
# Import all models so SQLModel registers their tables in metadata, then
# hand that metadata to Alembic for autogenerate support.
# ---------------------------------------------------------------------------
from sqlmodel import SQLModel

import app.models  # noqa: F401 — side-effect: registers User, Gist, GistShare

target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (no live DB connection needed)."""
    context.configure(
        url=database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (live DB connection)."""
    connectable = create_engine(database_url, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
