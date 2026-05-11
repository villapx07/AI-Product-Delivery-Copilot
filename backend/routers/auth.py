from __future__ import annotations
"""
Auth router — login, logout, current-user.
All auth endpoints are public (no auth required) except /me.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel

from db import get_db
from auth.jwt import verify_password, create_access_token, decode_token
from models import User, UserStatus

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ── Pydantic schemas ──────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str
    remember_me: bool = False


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    status: str
    created_at: str | None
    last_login: str | None


# ── Auth dependency (usable across routers) ────────────────────────────────────

def get_current_user_from_header(
    authorization: str = Header(...),
    db: Session = Depends(get_db),
) -> User:
    """FastAPI dependency — verifies Bearer token, returns User."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")

    token = authorization[7:]
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    if user.status == UserStatus.DISABLED:
        raise HTTPException(status_code=403, detail="Account is disabled")

    return user


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token."""
    user = db.query(User).filter(User.email == request.email.lower().strip()).first()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if user.status == UserStatus.DISABLED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Contact your administrator.",
        )

    user.last_login = datetime.utcnow()
    db.commit()

    expires = 7 * 24 * 60 if request.remember_me else 24 * 60
    token = create_access_token(user.id, user.role.value, expires_minutes=expires)

    return LoginResponse(
        access_token=token,
        expires_in=expires * 60,
        user=user.to_dict(include_email=True),
    )


@router.post("/logout")
async def logout():
    """Client discards token. Server-side blocklist can be added later."""
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user_from_header)):
    """Return current authenticated user."""
    return UserResponse(**user.to_dict(include_email=True))