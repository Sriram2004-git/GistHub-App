from collections.abc import Generator

from sqlmodel import Session, create_engine

from app.core.config import settings

_engine = None


def get_engine():
    global _engine
    if _engine is None:
        _engine = create_engine(settings.database_url, echo=False)
    return _engine


def get_session() -> Generator[Session, None, None]:
    with Session(get_engine()) as session:
        yield session
