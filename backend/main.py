import os
import json
from typing import AsyncGenerator, Optional
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from db import init_db, session_scope
from auth.jwt import hash_password
from models import User, UserRole, UserStatus
from config_manager import load_config, save_config, apply_config, DEFAULT_CONFIG
from session_store import create_session, get_session, list_sessions, update_session_artifacts
from export_utils import export_markdown, export_json, export_jira_csv
from prompt_orchestrator import (
    build_epic_prompt,
    build_user_stories_prompt,
    build_qa_prompt,
    build_analytics_prompt,
    build_risks_prompt,
    build_reviewer_prompt,
)
from llm_client import generate_json, stream_generate, generate_with_image

# ── Routers ──────────────────────────────────────────────────────────────────
from routers.auth import router as auth_router
from routers.users import router as users_router
from routers.workbenches import router as workbenches_router
from routers.artifacts import router as artifacts_router


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


# ── Config persistence ────────────────────────────────────────────────────────

CONFIG_FILE = Path(__file__).parent / "config.json"


class ConfigUpdate(BaseModel):
    provider: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Forge Delivery API starting...")
    init_db()                          # Create tables (idempotent)
    seed_super_admin()                 # Seed default admin
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

# ── Register routers ──────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(workbenches_router)
app.include_router(artifacts_router)


# ── Existing endpoints (kept for backward compat during transition) ─────────────

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
async def start_session(req: GenerateRequestWithSession):
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


# ── SSE generation pipeline ───────────────────────────────────────────────────

async def generate_sse(req) -> AsyncGenerator[dict, None]:
    all_artifacts = {}

    yield {"event": "module_start", "data": "epic_map"}
    try:
        system, user_prompt = build_epic_prompt(req)
        result = await generate_json(system, user_prompt)
        if result:
            epics = result if isinstance(result, list) else result.get("epics", result.get("epic_map", []))
            all_artifacts["epic_map"] = epics
            yield {"event": "module_complete", "data": json.dumps({"epic_map": epics})}
    except Exception as e:
        yield {"event": "error", "data": f"Epic Map generation failed: {str(e)}"}

    yield {"event": "module_start", "data": "user_stories"}
    try:
        epic_json = json.dumps(all_artifacts.get("epic_map", []))
        system, user_prompt = build_user_stories_prompt(req, epic_json)
        result = await generate_json(system, user_prompt)
        if result:
            stories = result if isinstance(result, list) else result.get("user_stories", result.get("stories", []))
            all_artifacts["user_stories"] = stories
            yield {"event": "module_complete", "data": json.dumps({"user_stories": stories})}
    except Exception as e:
        yield {"event": "error", "data": f"User Stories generation failed: {str(e)}"}

    yield {"event": "module_start", "data": "qa_scenarios"}
    try:
        stories_json = json.dumps(all_artifacts.get("user_stories", []))
        system, user_prompt = build_qa_prompt(req, stories_json)
        result = await generate_json(system, user_prompt)
        if result:
            qa = result if isinstance(result, list) else result.get("qa_scenarios", result.get("scenarios", []))
            all_artifacts["qa_scenarios"] = qa
            yield {"event": "module_complete", "data": json.dumps({"qa_scenarios": qa})}
    except Exception as e:
        yield {"event": "error", "data": f"QA Scenarios generation failed: {str(e)}"}

    yield {"event": "module_start", "data": "analytics_events"}
    try:
        stories_json = json.dumps(all_artifacts.get("user_stories", []))
        system, user_prompt = build_analytics_prompt(req, stories_json)
        result = await generate_json(system, user_prompt)
        if result:
            analytics = result if isinstance(result, list) else result.get("analytics_events", result.get("events", []))
            all_artifacts["analytics_events"] = analytics
            yield {"event": "module_complete", "data": json.dumps({"analytics_events": analytics})}
    except Exception as e:
        yield {"event": "error", "data": f"Analytics generation failed: {str(e)}"}

    yield {"event": "module_start", "data": "risks"}
    try:
        epic_json = json.dumps(all_artifacts.get("epic_map", []))
        system, user_prompt = build_risks_prompt(req, epic_json)
        result = await generate_json(system, user_prompt)
        if result:
            risks = result if isinstance(result, list) else result.get("risks", result.get("risks_list", []))
            all_artifacts["risks"] = risks
            yield {"event": "module_complete", "data": json.dumps({"risks": risks})}
    except Exception as e:
        yield {"event": "error", "data": f"Risks generation failed: {str(e)}"}

    yield {"event": "module_start", "data": "reviewer"}
    try:
        system, user_prompt = build_reviewer_prompt(req, all_artifacts)
        result = await generate_json(system, user_prompt)
        if result:
            reviews = result if isinstance(result, list) else result.get("reviewer_items", result.get("reviews", []))
            all_artifacts["reviewer_items"] = reviews
            yield {"event": "module_complete", "data": json.dumps({"reviewer_items": reviews})}
    except Exception as e:
        yield {"event": "error", "data": f"Reviewer generation failed: {str(e)}"}

    yield {"event": "complete", "data": json.dumps(all_artifacts)}


async def event_generator(req, on_complete=None) -> AsyncGenerator[str, None]:
    async for event in generate_sse(req):
        yield f"event: {event['event']}\ndata: {event['data']}\n\n"
        if event['event'] == 'complete' and on_complete:
            try:
                on_complete(json.loads(event['data']))
            except Exception:
                pass


@app.post("/api/generate")
async def generate(request):
    session_id = getattr(request, 'session_id', None)

    def _save_artifacts(artifacts: dict) -> None:
        if session_id:
            update_session_artifacts(session_id, artifacts)

    return StreamingResponse(
        event_generator(request, on_complete=_save_artifacts),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


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


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)