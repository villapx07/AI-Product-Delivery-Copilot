from __future__ import annotations
"""
Authentication utilities — JWT tokens, password hashing.
Auth abstraction allows MFA/SSO to be layered in without rewrites.
"""
import time
from typing import Optional

import jwt
import bcrypt

# ── Config (swap these for env var / secrets manager in production) ───────────
_JWT_SECRET = "forge-dev-secret-change-in-production"  # TODO: load from env
_JWT_ALGORITHM = "HS256"
_ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours


# ── Password hashing ──────────────────────────────────────────────────────────

def hash_password(plain_password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain_password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed.encode("utf-8"))


# ── JWT tokens ───────────────────────────────────────────────────────────────

def create_access_token(user_id: str, role: str, expires_minutes: int = _ACCESS_TOKEN_EXPIRE_MINUTES) -> str:
    """
    Create a signed JWT access token.

    Payloads are intentionally minimal — token holds identity only.
    Full user data is fetched from DB on verification.
    This keeps tokens small and allows instant role/session revocation.
    """
    now = int(time.time())
    payload = {
        "sub": user_id,
        "role": role,
        "iat": now,
        "exp": now + (expires_minutes * 60),
        "type": "access",
    }
    return jwt.encode(payload, _JWT_SECRET, algorithm=_JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT token.
    Returns payload dict or None if invalid/expired.
    """
    try:
        payload = jwt.decode(token, _JWT_SECRET, algorithms=[_JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_token_expiry(token: str) -> Optional[int]:
    """Return token expiration timestamp or None if invalid."""
    payload = decode_token(token)
    return payload.get("exp") if payload else None