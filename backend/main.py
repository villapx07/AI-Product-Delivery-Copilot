import os
import json
from typing import AsyncGenerator, Optional
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from utils.db import init_db, session_scope
from utils.session_store import create_session, get_session, list_sessions, update_session_artifacts
from utils.export_utils import export_markdown, export_json, export_jira_csv
from auth.jwt import hash_password
from models import User, UserRole, UserStatus
from config_manager import load_config, save_config, apply_config, DEFAULT_CONFIG
from routers.auth import router as auth_router
from routers.users import router as users_router
from routers.workbenches import router as workbenches_router
from routers.artifacts import router as artifacts_router
from generation.base import generate_single_module, MODULE_DEPENDENCIES, MODULE_DISPLAY_NAMES
from routers.workbenches import get_workbench
from routers.artifacts import get_artifacts_for_workbench
from schemas import ConfigUpdate, ModularGenerateRequest, GenerateRequestWithSession, SessionCreate

# ── Super Admin seed ──────────────────────────────────────────────────────────

def seed_super_admin():
    """Create default SUPER_ADMIN if no users exist. Run once on startup."""
    with session_scope() as db:
        count = db.query(User).count()
        if count == 0:
            admin = User(
                name="Admin",
                email="admin@forge.local",
                password_hash=hash_password("forge123"),
                role=UserRole.SUPER_ADMIN,
                status=UserStatus.ACTIVE,
            )
            db.add(admin)
            db.commit()
            print("  ✓ Seeded default SUPER_ADMIN: admin@forge.local / forge123")
        else:
            print(f"  ✓ {count} user(s) found — skipping seed")


# ── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Forge Delivery API starting...")
    init_db()
    seed_super_admin()
    cfg = load_config()
    apply_config(cfg)
    print(f"  ✓ Provider: {cfg.get('provider','openai')} | Model: {cfg.get('model','gpt-4o')}")
    yield
    print("👋 Shutting down...")


app = FastAPI(
    title="Forge Delivery",
    version="1.0.1",
    description="AI-native product delivery platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(workbenches_router)
app.include_router(artifacts_router)


# ── Config endpoints ───────────────────────────────────────────────────────────

@app.get("/api/config")
async def get_config():
    cfg = load_config()
    if cfg.get("api_key"):
        cfg["api_key"] = cfg["api_key"][:6] + "***"
    return cfg


@app.patch("/api/config")
async def update_config(update: ConfigUpdate):
    cfg = load_config()
    if update.provider is not None:
        cfg["provider"] = update.provider
    if update.api_key is not None:
        cfg["api_key"] = update.api_key
    if update.base_url is not None:
        cfg["base_url"] = update.base_url
    if update.model is not None:
        cfg["model"] = update.model
    saved = save_config(cfg)
    apply_config(saved)
    return {"status": "ok", "config": saved}


# ── Helper: load upstream artifacts for a workbench ─────────────────────────

def _get_upstream_artifacts(workbench_id: str) -> dict:
    """Fetch all saved artifacts for a workbench to use as generation context."""
    artifacts = get_artifacts_for_workbench(workbench_id)
    result = {}
    for a in artifacts:
        try:
            # a is now a plain dict with 'artifact_type' (str) and 'content_json' (str)
            key = a["artifact_type"]
            result[key] = json.loads(a["content_json"])
        except Exception:
            pass
    return result


def _build_discovery(workbench_id: str) -> dict:
    """Reconstruct discovery inputs from a workbench record."""
    wb = get_workbench(workbench_id)
    if not wb:
        return {}
    return {
        "feature_title": wb.get("title", ""),
        "business_objective": wb.get("business_objective", ""),
        "problem_statement": wb.get("problem_statement", ""),
        "success_metrics": wb.get("success_metrics", ""),
        "constraints": wb.get("constraints", ""),
        "assumptions": wb.get("assumptions", ""),
        "impacted_teams": wb.get("impacted_teams") or [],
    }


# ── Modular generation endpoint ───────────────────────────────────────────────

async def _modular_event_generator(req: ModularGenerateRequest):
    """SSE generator for per-module generation."""
    upstream = _get_upstream_artifacts(req.workbench_id)
    discovery = _build_discovery(req.workbench_id)

    async for event in generate_single_module(req.workbench_id, req.module, discovery, upstream):
        yield f"event: {event['event']}\ndata: {event['data']}\n\n"


@app.post("/api/generate/modular")
async def generate_modular(req: ModularGenerateRequest):
    """
    Per-module generation endpoint. Accepts workbench_id + module name.
    Loads upstream artifacts from DB and generates only the requested module.

    SSE events:
      - module_start        → generation began
      - prerequisite_missing → upstream artifacts not available
      - module_data        → JSON of generated {module: data}
      - module_complete    → module generation succeeded
      - error              → something went wrong
      - generation_done    → pipeline finished
    """
    return StreamingResponse(
        _modular_event_generator(req),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Legacy session-based endpoints ────────────────────────────────────────────

@app.get("/api/sessions")
async def get_sessions():
    sessions = list_sessions(limit=30)
    return {"sessions": sessions}


@app.get("/api/sessions/{session_id}")
async def get_session_by_id(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@app.post("/api/sessions")
async def start_session(req: SessionCreate):
    session = create_session(
        feature_title=req.feature_title,
        business_objective=req.business_objective,
        inputs={
            "problem_statement": req.problem_statement,
            "success_metrics": req.success_metrics,
            "constraints": req.constraints,
            "assumptions": req.assumptions,
            "impacted_teams": req.impacted_teams,
            "file_names": req.file_names,
        },
    )
    return {"session_id": session["id"], **session}


@app.get("/api/export/{session_id}/{format}")
async def export_session(session_id: str, format: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    artifacts = {}
    if session.get("artifacts_json"):
        try:
            artifacts = json.loads(session["artifacts_json"])
        except Exception:
            pass

    feature_title = session.get("feature_title", "")

    if format == "markdown":
        content = export_markdown(artifacts, feature_title)
        return {"content": content, "mime": "text/markdown"}
    elif format == "json":
        return {"content": export_json(artifacts, feature_title), "mime": "application/json"}
    elif format == "jira":
        return {"content": export_jira_csv(artifacts), "mime": "text/csv"}
    else:
        raise HTTPException(status_code=400, detail="Unknown format. Use: markdown, json, jira")


# ── Legacy SSE generation (full pipeline — kept for backward compat) ──────────

@app.get("/health")
async def health():
    cfg = load_config()
    return {
        "status": "ok",
        "service": "forge-delivery",
        "version": "1.0.1",
        "provider": cfg.get("provider", "openai"),
        "model": cfg.get("model", "gpt-4o"),
    }
