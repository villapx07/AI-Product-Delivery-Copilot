from __future__ import annotations
"""
RBAC permission matrix and auth dependency for FastAPI routes.
Enforces backend authorization — NOT frontend-only hiding.
All protected routes must declare required_roles.
"""
from typing import List, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from db import get_db
from auth.jwt import decode_token
from models import User, UserRole, UserStatus

security = HTTPBearer(auto_error=False)  # auto_error=False lets us handle missing token manually


# ── Permission matrix ──────────────────────────────────────────────────────────

# Hierarchical: SUPER_ADMIN superset of ADMIN superset of PRODUCT_MANAGER superset of VIEWER
ROLE_HIERARCHY = {
    UserRole.SUPER_ADMIN: 4,
    UserRole.ADMIN: 3,
    UserRole.PRODUCT_MANAGER: 2,
    UserRole.VIEWER: 1,
}


def has_permission(user_role: UserRole, required_roles: List[UserRole]) -> bool:
    """Check if user_role meets at least one of required_roles."""
    if not required_roles:
        return True
    user_level = ROLE_HIERARCHY.get(user_role, 0)
    return any(ROLE_HIERARCHY.get(r, 0) <= user_level for r in required_roles)


# ── Auth dependency ───────────────────────────────────────────────────────────

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency that:
      1. Extracts Bearer token from Authorization header
      2. Verifies JWT signature and expiry
      3. Loads User from DB
      4. Returns User object

    Raises 401 if token missing/invalid, 403 if user disabled.
    All /api/* routes should include this as a dependency.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if user.status == UserStatus.DISABLED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    return user


# Alias for compatibility with router imports
get_current_user_from_header = get_current_user


def require_roles(*roles: UserRole):
    """
    Factory for role-check dependency.
    Usage: @router.get("/admin", dependencies=[Depends(require_roles(UserRole.ADMIN))])
    """
    async def role_checker(user: User = Depends(get_current_user)) -> User:
        if not has_permission(user.role, list(roles)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {[r.value for r in roles]}",
            )
        return user
    return role_checker


# ── Workbench access check ────────────────────────────────────────────────────

def check_workbench_access(user: User, workbench, write: bool = False) -> bool:
    """Return True if user can access this workbench."""
    if user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        return True
    if workbench.owner_id == user.id:
        return True
    # TODO: collaborative sharing (future): check collaborators table
    return False


# ── Optional auth (for public routes that need user context if present) ────────

async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Return user if token present and valid, otherwise None (for public pages)."""
    if not credentials:
        return None
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None