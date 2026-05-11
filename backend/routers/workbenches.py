from __future__ import annotations
"""
Workbenches router — CRUD and autosave.
RBAC enforced: PRODUCT_MANAGER owns workbenches, VIEWER reads only,
ADMIN/SUPER_ADMIN can view all.
"""
from datetime import datetime
from typing import Optional, List, Dict

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from db import get_db
from middleware.rbac import get_current_user_from_header, require_roles
from models import User, UserRole, UserStatus, Workbench, WorkbenchStatus, Artifact

router = APIRouter(prefix="/api/workbenches", tags=["workbenches"])

# ── Schemas ───────────────────────────────────────────────────────────────────

class CreateWorkbenchRequest(BaseModel):
    title: str
    description: str | None = None
    business_objective: str | None = None
    problem_statement: str | None = None
    success_metrics: str | None = None
    constraints: str | None = None
    rollout_assumptions: str | None = None
    impacted_teams: str | None = None


class UpdateWorkbenchRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    business_objective: str | None = None
    problem_statement: str | None = None
    success_metrics: str | None = None
    constraints: str | None = None
    rollout_assumptions: str | None = None
    impacted_teams: str | None = None
    status: str | None = None


class WorkbenchResponse(BaseModel):
    id: str
    owner_id: str
    title: str
    description: str | None
    business_objective: str | None
    problem_statement: str | None
    success_metrics: str | None
    constraints: str | None
    rollout_assumptions: str | None
    impacted_teams: str | None
    status: str
    created_at: str | None
    updated_at: str | None
    last_opened_at: str | None
    artifact_count: int = 0
    owner: dict | None = None


class WorkbenchListResponse(BaseModel):
    workbenches: List[WorkbenchResponse]
    total: int


# ── Helpers ───────────────────────────────────────────────────────────────────

def check_workbench_access(user: User, workbench: Workbench, write: bool = False) -> bool:
    """Return True if user can access this workbench."""
    if user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        return True
    if workbench.owner_id == user.id:
        return True
    # TODO: collaborative sharing (future): check collaborators table
    return False


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("", response_model=WorkbenchResponse)
async def create_workbench(
    request: CreateWorkbenchRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_from_header),
):
    """Create a new workbench. All authenticated users can create."""
    if user.status == UserStatus.DISABLED:
        raise HTTPException(status_code=403, detail="Account is disabled")

    workbench = Workbench(
        owner_id=user.id,
        title=request.title.strip(),
        description=request.description,
        business_objective=request.business_objective,
        problem_statement=request.problem_statement,
        success_metrics=request.success_metrics,
        constraints=request.constraints,
        rollout_assumptions=request.rollout_assumptions,
        impacted_teams=request.impacted_teams,
        status=WorkbenchStatus.DRAFT,
    )
    db.add(workbench)
    db.commit()
    db.refresh(workbench)

    return _build_workbench_response(workbench, db, user)


@router.get("", response_model=WorkbenchListResponse)
async def list_workbenches(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_from_header),
    status_filter: Optional[str] = Query(None, alias="status"),
    sort: Optional[str] = Query("updated_at", alias="sort"),
    order: Optional[str] = Query("desc", alias="order"),
):
    """
    List workbenches the current user can access.
    SUPER_ADMIN/ADMIN see all; others see only their own.
    Supports ?sort=last_opened_at&order=desc for dashboard sorting.
    """
    query = db.query(Workbench)

    if user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        query = query.filter(Workbench.owner_id == user.id)

    if status_filter:
        try:
            query = query.filter(Workbench.status == WorkbenchStatus(status_filter))
        except ValueError:
            pass  # ignore invalid status

    # Sorting
    sort_col = {
        "updated_at": Workbench.updated_at,
        "created_at": Workbench.created_at,
        "last_opened_at": Workbench.last_opened_at,
        "title": Workbench.title,
    }.get(sort, Workbench.updated_at)

    if order == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    workbenches = query.all()
    return WorkbenchListResponse(
        workbenches=[_build_workbench_response(w, db, user) for w in workbenches],
        total=len(workbenches),
    )


@router.get("/{workbench_id}", response_model=WorkbenchResponse)
async def get_workbench(
    workbench_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_from_header),
):
    """Open a workbench — updates last_opened_at and returns full state."""
    workbench = db.query(Workbench).filter(Workbench.id == workbench_id).first()
    if not workbench:
        raise HTTPException(status_code=404, detail="Workbench not found")

    if not check_workbench_access(user, workbench):
        raise HTTPException(status_code=403, detail="Access denied")

    workbench.last_opened_at = datetime.utcnow()
    db.commit()

    return _build_workbench_response(workbench, db, user)


@router.patch("/{workbench_id}", response_model=WorkbenchResponse)
async def update_workbench(
    workbench_id: str,
    request: UpdateWorkbenchRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_from_header),
):
    """Update workbench fields (autosave target). Returns updated workbench."""
    workbench = db.query(Workbench).filter(Workbench.id == workbench_id).first()
    if not workbench:
        raise HTTPException(status_code=404, detail="Workbench not found")

    if not check_workbench_access(user, workbench, write=True):
        raise HTTPException(status_code=403, detail="Access denied")

    # Apply non-None updates
    for field, value in request.model_dump(exclude_unset=True).items():
        if field == "status" and value:
            try:
                value = WorkbenchStatus(value)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid status: {value}")
        if hasattr(workbench, field) and value is not None:
            setattr(workbench, field, value)

    db.commit()
    db.refresh(workbench)

    return _build_workbench_response(workbench, db, user)


@router.patch("/{workbench_id}/autosave", response_model=WorkbenchResponse)
async def autosave_workbench(
    workbench_id: str,
    request: UpdateWorkbenchRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_from_header),
):
    """
    Autosave endpoint — same as PATCH but semantics differ.
    Returns lightweight response for frequent saves.
    """
    return await update_workbench(workbench_id, request, db, user)


@router.delete("/{workbench_id}")
async def delete_workbench(
    workbench_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_from_header),
):
    """Soft-delete (archive) a workbench. Owner or ADMIN only."""
    workbench = db.query(Workbench).filter(Workbench.id == workbench_id).first()
    if not workbench:
        raise HTTPException(status_code=404, detail="Workbench not found")

    if user.role == UserRole.VIEWER:
        raise HTTPException(status_code=403, detail="Viewers cannot delete")
    if user.role == UserRole.PRODUCT_MANAGER and workbench.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Can only delete your own workbenches")
    if user.role == UserRole.ADMIN and workbench.owner_id == user.id:
        pass  # admin can delete their own

    workbench.status = WorkbenchStatus.ARCHIVED
    db.commit()
    return {"message": "Workbench archived"}


# ── Response builder ──────────────────────────────────────────────────────────

def _build_workbench_response(workbench: Workbench, db: Session, requesting_user: User) -> WorkbenchResponse:
    """Build a WorkbenchResponse with computed fields."""
    artifact_count = db.query(Artifact).filter(Artifact.workbench_id == workbench.id).count()
    include_owner = requesting_user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]
    return WorkbenchResponse(
        **workbench.to_dict(include_owner=include_owner),
        artifact_count=artifact_count,
    )


# ── Sync helper for generation pipeline (no auth, used by main.py) ────────────

def get_workbench(workbench_id: str):
    """Return a Workbench row by id as a detached-safe dict (no auth — used by generation pipeline)."""
    from db import session_scope
    with session_scope() as db:
        wb = db.query(Workbench).filter(Workbench.id == workbench_id).first()
        if not wb:
            return None
        return {
            "id": wb.id, "title": wb.title, "status": wb.status,
            "business_objective": wb.business_objective,
            "problem_statement": wb.problem_statement,
            "success_metrics": wb.success_metrics,
            "constraints": wb.constraints,
            "assumptions": wb.rollout_assumptions,
            "impacted_teams": wb.impacted_teams,
            "owner_id": wb.owner_id,
        }