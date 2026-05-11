"""
Database utilities.
Business logic should import session_scope() from here, not raw engine.
"""
from __future__ import annotations

from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from models import Base

# ── Engine (swap URI here for Postgres) ─────────────────────────────────────
_DATABASE_URL = "sqlite:///./forge.db"

engine = create_engine(
    _DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    echo=False,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency — inject db session into route handlers."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def session_scope() -> Generator[Session, None, None]:
    """Context manager for repository/service layer (non-FastAPI contexts)."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db() -> None:
    """Create all tables. Safe to call on every startup (no-op if exists)."""
    Base.metadata.create_all(bind=engine)