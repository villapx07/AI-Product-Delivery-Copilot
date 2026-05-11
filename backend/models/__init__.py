from __future__ import annotations
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, String, DateTime, Text, ForeignKey, Enum, Boolean, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, declarative_base
import uuid

Base = declarative_base()


class UserRole(str, PyEnum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    PRODUCT_MANAGER = "PRODUCT_MANAGER"
    VIEWER = "VIEWER"


class UserStatus(str, PyEnum):
    ACTIVE = "ACTIVE"
    DISABLED = "DISABLED"
    PENDING = "PENDING"


class WorkbenchStatus(str, PyEnum):
    DRAFT = "DRAFT"
    IN_PROGRESS = "IN_PROGRESS"
    REVIEW = "REVIEW"
    ARCHIVED = "ARCHIVED"


class ArtifactType(str, PyEnum):
    EPIC_MAP = "epic_map"
    USER_STORIES = "user_stories"
    QA_SCENARIOS = "qa_scenarios"
    ANALYTICS = "analytics"
    RISKS = "risks"
    REVIEWER_COMMENTS = "reviewer_comments"


# ── User ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.PRODUCT_MANAGER)
    status = Column(Enum(UserStatus), nullable=False, default=UserStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    # Relations
    workbenches = relationship("Workbench", back_populates="owner", lazy="dynamic")

    def to_dict(self, include_email: bool = False) -> dict:
        d = {
            "id": self.id,
            "name": self.name,
            "role": self.role.value,
            "status": self.status.value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
        }
        if include_email:
            d["email"] = self.email
        return d


# ── Workbench ─────────────────────────────────────────────────────────────────

class Workbench(Base):
    __tablename__ = "workbenches"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    # Discovery fields
    business_objective = Column(Text, nullable=True)
    problem_statement = Column(Text, nullable=True)
    success_metrics = Column(Text, nullable=True)
    constraints = Column(Text, nullable=True)
    rollout_assumptions = Column(Text, nullable=True)
    impacted_teams = Column(Text, nullable=True)

    status = Column(Enum(WorkbenchStatus), nullable=False, default=WorkbenchStatus.DRAFT)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_opened_at = Column(DateTime, nullable=True)

    # Relations
    owner = relationship("User", back_populates="workbenches")
    artifacts = relationship("Artifact", back_populates="workbench", cascade="all, delete-orphan", lazy="dynamic")

    def to_dict(self, include_owner: bool = False) -> dict:
        d = {
            "id": self.id,
            "owner_id": self.owner_id,
            "title": self.title,
            "description": self.description,
            "business_objective": self.business_objective,
            "problem_statement": self.problem_statement,
            "success_metrics": self.success_metrics,
            "constraints": self.constraints,
            "rollout_assumptions": self.rollout_assumptions,
            "impacted_teams": self.impacted_teams,
            "status": self.status.value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_opened_at": self.last_opened_at.isoformat() if self.last_opened_at else None,
        }
        if include_owner and self.owner:
            d["owner"] = self.owner.to_dict()
        return d


# ── Artifact ─────────────────────────────────────────────────────────────────

class Artifact(Base):
    __tablename__ = "artifacts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workbench_id = Column(String(36), ForeignKey("workbenches.id"), nullable=False, index=True)
    artifact_type = Column(Enum(ArtifactType), nullable=False, index=True)

    # Content stored as JSON text
    content_json = Column(Text, nullable=True)

    # Provenance / audit
    llm_provider = Column(String(50), nullable=True)
    llm_model = Column(String(100), nullable=True)
    generation_prompt = Column(Text, nullable=True)
    raw_response = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relations
    workbench = relationship("Workbench", back_populates="artifacts")

    # Indexes for common queries
    __table_args__ = (
        Index("ix_artifacts_workbench_type", "workbench_id", "artifact_type"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "workbench_id": self.workbench_id,
            "artifact_type": self.artifact_type.value,
            "content_json": self.content_json,
            "llm_provider": self.llm_provider,
            "llm_model": self.llm_model,
            "generation_prompt": self.generation_prompt,
            "raw_response": self.raw_response,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }