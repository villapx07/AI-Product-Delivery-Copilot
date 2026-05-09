import os
import json
from typing import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse

from models import GenerateRequest
from prompt_orchestrator import (
    build_epic_prompt,
    build_user_stories_prompt,
    build_qa_prompt,
    build_analytics_prompt,
    build_risks_prompt,
    build_reviewer_prompt,
)
from llm_client import generate_json, stream_generate


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 AI Product Delivery Copilot API starting...")
    yield
    # Shutdown
    print("👋 Shutting down...")


app = FastAPI(title="AI Product Delivery Copilot", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def generate_sse(req: GenerateRequest) -> AsyncGenerator[dict, None]:
    """Main generation pipeline with SSE streaming."""

    all_artifacts = {}

    # Step 1: Epic Map
    yield {"event": "module_start", "data": "epic_map"}
    try:
        system, user = build_epic_prompt(req)
        result = await generate_json(system, user)
        if result:
            epics = result if isinstance(result, list) else result.get("epics", result.get("epic_map", []))
            all_artifacts["epic_map"] = epics
            yield {"event": "module_complete", "data": json.dumps({"epic_map": epics})}
    except Exception as e:
        yield {"event": "error", "data": f"Epic Map generation failed: {str(e)}"}

    # Step 2: User Stories
    yield {"event": "module_start", "data": "user_stories"}
    try:
        epic_json = json.dumps(all_artifacts.get("epic_map", []))
        system, user = build_user_stories_prompt(req, epic_json)
        result = await generate_json(system, user)
        if result:
            stories = result if isinstance(result, list) else result.get("user_stories", result.get("stories", []))
            all_artifacts["user_stories"] = stories
            yield {"event": "module_complete", "data": json.dumps({"user_stories": stories})}
    except Exception as e:
        yield {"event": "error", "data": f"User Stories generation failed: {str(e)}"}

    # Step 3: QA Scenarios
    yield {"event": "module_start", "data": "qa_scenarios"}
    try:
        stories_json = json.dumps(all_artifacts.get("user_stories", []))
        system, user = build_qa_prompt(req, stories_json)
        result = await generate_json(system, user)
        if result:
            qa = result if isinstance(result, list) else result.get("qa_scenarios", result.get("scenarios", []))
            all_artifacts["qa_scenarios"] = qa
            yield {"event": "module_complete", "data": json.dumps({"qa_scenarios": qa})}
    except Exception as e:
        yield {"event": "error", "data": f"QA Scenarios generation failed: {str(e)}"}

    # Step 4: Analytics Events
    yield {"event": "module_start", "data": "analytics_events"}
    try:
        stories_json = json.dumps(all_artifacts.get("user_stories", []))
        system, user = build_analytics_prompt(req, stories_json)
        result = await generate_json(system, user)
        if result:
            analytics = result if isinstance(result, list) else result.get("analytics_events", result.get("events", []))
            all_artifacts["analytics_events"] = analytics
            yield {"event": "module_complete", "data": json.dumps({"analytics_events": analytics})}
    except Exception as e:
        yield {"event": "error", "data": f"Analytics generation failed: {str(e)}"}

    # Step 5: Risks
    yield {"event": "module_start", "data": "risks"}
    try:
        epic_json = json.dumps(all_artifacts.get("epic_map", []))
        system, user = build_risks_prompt(req, epic_json)
        result = await generate_json(system, user)
        if result:
            risks = result if isinstance(result, list) else result.get("risks", result.get("risks_list", []))
            all_artifacts["risks"] = risks
            yield {"event": "module_complete", "data": json.dumps({"risks": risks})}
    except Exception as e:
        yield {"event": "error", "data": f"Risks generation failed: {str(e)}"}

    # Step 6: AI Reviewer
    yield {"event": "module_start", "data": "reviewer"}
    try:
        system, user = build_reviewer_prompt(req, all_artifacts)
        result = await generate_json(system, user)
        if result:
            reviews = result if isinstance(result, list) else result.get("reviewer_items", result.get("reviews", []))
            all_artifacts["reviewer_items"] = reviews
            yield {"event": "module_complete", "data": json.dumps({"reviewer_items": reviews})}
    except Exception as e:
        yield {"event": "error", "data": f"Reviewer generation failed: {str(e)}"}

    # Complete
    yield {"event": "complete", "data": json.dumps(all_artifacts)}


async def event_generator(req: GenerateRequest) -> AsyncGenerator[str, None]:
    """Convert generation events to SSE format."""
    async for event in generate_sse(req):
        yield f"event: {event['event']}\ndata: {event['data']}\n\n"


@app.post("/api/generate")
async def generate(request: GenerateRequest):
    """
    Main generation endpoint. Streams SSE events as each module completes.
    """
    return StreamingResponse(
        event_generator(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-product-delivery-copilot"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)