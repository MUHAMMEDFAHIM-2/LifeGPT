from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


def _resolve_url(url: str) -> str:
    # Neon/Supabase/Render all hand out bare "postgresql://" strings, but
    # we installed psycopg (v3) rather than the older psycopg2 — SQLAlchemy
    # needs the driver named explicitly to pick it.
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


database_url = _resolve_url(settings.database_url)

engine = create_engine(
    database_url,
    connect_args={"check_same_thread": False}
    if database_url.startswith("sqlite")
    else {},
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
