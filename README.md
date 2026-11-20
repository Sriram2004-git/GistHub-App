# Gist API

A backend REST API for creating, managing, and sharing code/text gists.
Users can register, log in with JWT authentication, and perform full CRUD on their own gists.
Gists can be shared with specific other users, who can read but not modify them.

## Technology Stack

| Concern | Choice |
|---|---|
| Framework | FastAPI |
| ASGI Server | Uvicorn |
| ORM | SQLModel (SQLAlchemy core) |
| Database | PostgreSQL |
| Migrations | Alembic |
| Auth | PyJWT (HS256) |
| Password hashing | pwdlib / Argon2 |
| Testing | pytest |

## Python Version

Python **3.13** is required (tested with 3.13.15).

## Prerequisites

- Python 3.13 installed and available via `py` or `python`.
- A running PostgreSQL server accessible from your machine.
- A PostgreSQL database and user already created (the app does not create them).

## Local Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd Fast_API_baknd
```

### 2. Create and activate the virtual environment

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1      # PowerShell
# or
.venv\Scripts\activate.bat      # cmd
```

### 3. Install dependencies

```powershell
pip install -e ".[dev]"
```

### 4. Configure environment

```powershell
Copy-Item .env.example .env
```

Open `.env` and fill in your PostgreSQL connection details and a strong JWT secret.
Never commit `.env` — it is in `.gitignore`.

### 5. Run database migrations

```powershell
alembic upgrade head
```

### 6. Start the development server

```powershell
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.
Interactive docs: `http://localhost:8000/docs`.

## Running Tests

```powershell
pytest
```

## Implementation Status

| Feature | Status |
|---|---|
| Project foundation | ✅ Done |
| Configuration | ✅ Done |
| Database models (User, Gist, GistShare) | ✅ Done |
| Alembic migrations | ✅ Done |
| User registration / login | ✅ Done |
| JWT authentication | ✅ Done |
| Gist CRUD | ✅ Done |
| Gist sharing | ✅ Done |
