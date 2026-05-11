from __future__ import annotations
"""
Artifacts router — save/load generated AI outputs.
Artifacs are modular, version-ready (future), and decoupled from workbench state.
"""
from datetime import datetime
from typing import Optional, List, Dict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from db import get_db
from middleware.rbac import get_current_user_from_header, check_workbench_access
from models import User, UserStatus, Workbench, Artifact, ArtifactType

router = APIRouter(prefix="/api/artifacts", tags=["artifacts"])

# ── Schemas ───────────────────────────────────────────────────────────────────

class SaveArtifactRequest(BaseModel):
    artifact_type: str
    content_json: str  # JSON string of the artifact content
    llm_provider: str | None = None
    llm_model: str | None = None
    generation_prompt: str | None = None
    raw_response: str | None = None


class ArtifactResponse(BaseModel):
    id: str
    workbench_id: str
    artifact_type: str
    content_json: str | None
    llm_provider: str | None
    llm_model: str | None
    generation_prompt: str | None
    raw_response: str | None
    created_at: str | None
    updated_at: str | None


class ArtifactListResponse(BaseModel):
    artifacts: List[ArtifactResponse]
    total: int


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/workbench/{workbench_id}", response_model=ArtifactResponse)
async def save_artifact(
    workbench_id: str,
    request: SaveArtifactRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_from_header),
):
    """
    Save or update an artifact for a workbench.
    If artifact_type already exists for this workbench, upsert (update).
    Otherwise create new.
    """
    if user.status == UserStatus.DISABLED:
        raise HTTPException(status_code=403, detail="Account is disabled")

    workbench = db.query(Workbench).filter(Workbench.id == workbench_id).first()
    if not workbench:
        raise HTTPException(status_code=404, detail="Workbench not found")

    if not check_workbench_access(user, workbench, write=True):
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        artifact_type = ArtifactType(request.artifact_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid artifact_type: {request.artifact_type}")

    # Upsert: find existing artifact of same type for this workbench
    existing = db.query(Artifact).filter(
        Artifact.workbench_id == workbench_id,
        Artifact.artifact_type == artifact_type,
    ).first()

    if existing:
        existing.content_json = request.content_json
        existing.llm_provider = request.llm_provider
        existing.llm_model = request.llm_model
        existing.generation_prompt = request.generation_prompt
        existing.raw_response = request.raw_response
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        artifact = existing
    else:
        artifact = Artifact(
            workbench_id=workbench_id,
            artifact_type=artifact_type,
            content_json=request.content_json,
            llm_provider=request.llm_provider,
            llm_model=request.llm_model,
            generation_prompt=request.generation_prompt,
            raw_response=request.raw_response,
        )
        db.add(artifact)
        db.commit()
        db.refresh(artifact)

    return ArtifactResponse(**artifact.to_dict())


@router.get("/workbench/{workbench_id}", response_model=ArtifactListResponse)
async def list_artifacts(
    workbench_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_from_header),
    artifact_type: Optional[str] = Query(None, alias="type"),
):
    """Load all artifacts for a workbench (restore on open)."""
    workbench = db.query(Workbench).filter(Workbench.id == workbench_id).first()
    if not workbench:
        raise HTTPException(status_code=404, detail="Workbench not found")

    if not check_workbench_access(user, workbench):
        raise HTTPException(status_code=403, detail="Access denied")

    query = db.query(Artifact).filter(Artifact.workbench_id == workbench_id)
    if artifact_type:
        try:
            query = query.filter(Artifact.artifact_type == ArtifactType(artifact_type))
        except ValueError:
            pass

    artifacts = query.all()
    return ArtifactListResponse(
        artifacts=[ArtifactResponse(**a.to_dict()) for a in artifacts],
        total=len(artifacts),
    )


@router.get("/{artifact_id}", response_model=ArtifactResponse)
async def get_artifact(
    artifact_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_from_header),
):
    """Load a single artifact by ID."""
    artifact = db.query(Artifact).filter(Artifact.id == artifact_id).first()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    workbench = db.query(Workbench).filter(Workbench.id == artifact.workbench_id).first()
    if not check_workbench_access(user, workbench):
        raise HTTPException(status_code=403, detail="Access denied")

    return ArtifactResponse(**artifact.to_dict())


@router.delete("/{artifact_id}")
async def delete_artifact(
    artifact_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_from_header),
):
    """Delete a specific artifact."""
    if user.role == UserRole.VIEWER:
        raise HTTPException(status_code=403, detail="Viewers cannot delete")

    artifact = db.query(Artifact).filter(Artifact.id == artifact_id).first()
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")

    workbench = db.query(Workbench).filter(Workbench.id == artifact.workbench_id).first()
    if not check_workbench_access(user, workbench, write=True):
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(artifact)
    db.commit()
    return {"message": "Artifact deleted"}