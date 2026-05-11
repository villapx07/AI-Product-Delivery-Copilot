"""
Session storage using SQLite.
Stores: projects/sessions, their inputs, and all generated artifacts.
"""
import json
import uuid
from pathlib import Path
from typing import Optional

import sqlite3

DB_PATH = Path(__file__).parent.parent / "sessions.db"


def _get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = _get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            feature_title TEXT,
            business_objective TEXT,
            inputs_json TEXT,
            artifacts_json TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.commit()
    conn.close()


def create_session(
    feature_title: str,
    business_objective: str,
    inputs: dict,
    artifacts: Optional[dict] = None,
) -> dict:
    """Create a new session and return the session record."""
    conn = _get_db()
    sid = str(uuid.uuid4())[:8]
    now = conn.execute("SELECT datetime('now')").fetchone()[0]

    conn.execute(
        """
        INSERT INTO sessions (id, title, feature_title, business_objective, inputs_json, artifacts_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (sid, feature_title, feature_title, business_objective, json.dumps(inputs), json.dumps(artifacts or {}), now, now),
    )
    conn.commit()

    row = conn.execute("SELECT * FROM sessions WHERE id = ?", (sid,)).fetchone()
    conn.close()
    return dict(row)


def update_session_artifacts(session_id: str, artifacts: dict) -> None:
    """Update the artifacts for an existing session."""
    conn = _get_db()
    conn.execute(
        "UPDATE sessions SET artifacts_json = ?, updated_at = datetime('now') WHERE id = ?",
        (json.dumps(artifacts), session_id),
    )
    conn.commit()
    conn.close()


def get_session(session_id: str) -> Optional[dict]:
    """Retrieve a session by ID."""
    conn = _get_db()
    row = conn.execute("SELECT * FROM sessions WHERE id = ?", (session_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def list_sessions(limit: int = 20) -> list[dict]:
    """List recent sessions, newest first."""
    conn = _get_db()
    rows = conn.execute(
        "SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def delete_session(session_id: str) -> None:
    conn = _get_db()
    conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    conn.commit()
    conn.close()


# Initialize on import
init_db()