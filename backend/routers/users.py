from __future__ import annotations
from typing import List, Dict
"""
Users router — admin user management.
Accessible only to SUPER_ADMIN and ADMIN.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from db import get_db
from auth.jwt import hash_password, verify_password
from middleware.rbac import get_current_user_from_header, require_roles
from models import User, UserRole, UserStatus

router = APIRouter(prefix="/api/users", tags=["users"])

# ── Schemas ───────────────────────────────────────────────────────────────────

class CreateUserRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "PRODUCT_MANAGER"


class UpdateUserRequest(BaseModel):
    name: str | None = None
    role: str | None = None
    status: str | None = None


class ResetPasswordRequest(BaseModel):
    new_password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    status: str
    created_at: str | None
    last_login: str | None


class UserListResponse(BaseModel):
    users: List[dict]
    total: int


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("", response_model=UserResponse)
async def create_user(
    request: CreateUserRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
):
    """Create a new user. SUPER_ADMIN and ADMIN only."""
    existing = db.query(User).filter(User.email == request.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    role = UserRole(request.role) if request.role in [r.value for r in UserRole] else UserRole.PRODUCT_MANAGER

    user = User(
        name=request.name.strip(),
        email=request.email.lower().strip(),
        password_hash=hash_password(request.password),
        role=role,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return UserResponse(**user.to_dict(include_email=True))


@router.get("", response_model=UserListResponse)
async def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
):
    """List all users. SUPER_ADMIN and ADMIN only."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return UserListResponse(
        users=[u.to_dict(include_email=True) for u in users],
        total=len(users),
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
):
    """Get a single user by ID. SUPER_ADMIN and ADMIN only."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user.to_dict(include_email=True))


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    request: UpdateUserRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
):
    """Update user name, role, or status. SUPER_ADMIN and ADMIN only."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if request.name is not None:
        user.name = request.name.strip()
    if request.role is not None and request.role in [r.value for r in UserRole]:
        user.role = UserRole(request.role)
    if request.status is not None and request.status in [s.value for s in UserStatus]:
        user.status = UserStatus(request.status)

    db.commit()
    db.refresh(user)
    return UserResponse(**user.to_dict(include_email=True))


@router.post("/{user_id}/reset-password")
async def reset_password(
    user_id: str,
    request: ResetPasswordRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
):
    """Reset a user's password. SUPER_ADMIN and ADMIN only."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(request.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


@router.delete("/{user_id}")
async def disable_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    """Disable a user (soft delete). SUPER_ADMIN only."""
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot disable your own account")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.status = UserStatus.DISABLED
    db.commit()
    return {"message": "User disabled"}