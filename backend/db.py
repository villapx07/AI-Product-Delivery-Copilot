from __future__ import annotations
"""
Database connection and session management.
Supports SQLite (MVP) with engine/config swap to PostgreSQL for production.
Business logic should import session_scoped() and repository classes — never raw engine.
"""
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
    connect_args={"check_same_thread": False},  # SQLite requirement
    poolclass=StaticPool,  # Single connection for SQLite (no concurrency issues)
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
    """Create all tables. Safe to call on every startup (no-op if exist)."""
    Base.metadata.create_all(bind=engine)