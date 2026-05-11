"""
Pydantic schemas for API request/response models.
Extracted from main.py for modularity and reuse across routers.
"""
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel


# ── Config ─────────────────────────────────────────────────────────────────────

class ConfigUpdate(BaseModel):
    provider: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None


# ── Modular generation ─────────────────────────────────────────────────────────

class ModularGenerateRequest(BaseModel):
    workbench_id: str
    module: str  # epic_map | user_stories | qa_scenarios | analytics | risks | reviewer
    regenerate: bool = False


# ── Legacy generation (session-based) ─────────────────────────────────────────

class GenerateRequestWithSession(BaseModel):
    session_id: Optional[str] = None
    feature_title: str
    business_objective: str
    problem_statement: Optional[str] = ""
    success_metrics: Optional[str] = ""
    constraints: Optional[str] = ""
    assumptions: Optional[str] = ""
    impacted_teams: list[str] = []
    uploaded_files: list[str] = []
    file_names: list[str] = []
    workbench_id: Optional[str] = None


# ── Session ────────────────────────────────────────────────────────────────────

class SessionCreate(BaseModel):
    feature_title: str
    business_objective: str
    problem_statement: Optional[str] = ""
    success_metrics: Optional[str] = ""
    constraints: Optional[str] = ""
    assumptions: Optional[str] = ""
    impacted_teams: list[str] = []
    uploaded_files: list[str] = []
    file_names: list[str] = []


# ── Export ─────────────────────────────────────────────────────────────────────

class ExportRequest(BaseModel):
    format: str  # markdown | json | jira