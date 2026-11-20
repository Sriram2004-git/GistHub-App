FROM python:3.13-slim

# Install uv from the official uv image
COPY --from=ghcr.io/astral-sh/uv:0.12.18 /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Configure Python and uv environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:$PATH"

# Copy dependency definition files first for layer caching
COPY pyproject.toml uv.lock .python-version ./

# Install runtime dependencies only using the frozen lockfile
RUN uv sync --frozen --no-install-project --no-dev

# Copy application source code and Alembic configuration
COPY alembic.ini ./
COPY alembic/ ./alembic/
COPY app/ ./app/

# Install the application package into the virtual environment
RUN uv sync --frozen --no-dev

# Expose Uvicorn default port
EXPOSE 8000

# Start Uvicorn bound to 0.0.0.0:8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

