"""
Generation pipeline: per-module generation with dependency resolution.

Each module is self-contained with its own prompt builder and artifact parser.
The orchestrator handles:
  - Dependency ordering
  - Upstream artifact injection
  - SSE event emission
  - Error handling & graceful recovery
"""
from __future__ import annotations

import json
from abc import ABC, abstractmethod
from typing import AsyncGenerator, Optional, Tuple

from llm_client import generate_json
from prompt_orchestrator import (
    build_epic_prompt,
    build_user_stories_prompt,
    build_qa_prompt,
    build_analytics_prompt,
    build_risks_prompt,
    build_reviewer_prompt,
)


# ── Module registry ────────────────────────────────────────────────────────────

MODULE_DEPENDENCIES = {
    "epic_map": [],
    "user_stories": ["epic_map"],
    "qa_scenarios": ["user_stories"],
    "analytics": ["user_stories"],
    "risks": ["epic_map"],
    "reviewer": ["epic_map", "user_stories", "qa_scenarios", "analytics", "risks"],
}

MODULE_DISPLAY_NAMES = {
    "epic_map": "Epic Map",
    "user_stories": "User Stories",
    "qa_scenarios": "QA Scenarios",
    "analytics": "Analytics Events",
    "risks": "Risks",
    "reviewer": "AI Review",
}

# Modules that need only the discovery inputs (no upstream artifacts)
DISCOVERY_ONLY_MODULES = {"epic_map", "risks"}

# Modules that need user_stories as upstream
STORIES_UPSTREAM_MODULES = {"qa_scenarios", "analytics"}

# Modules that need epic_map as upstream
EPICS_UPSTREAM_MODULES = {"user_stories", "risks"}

# Modules that need all artifacts
ALL_UPSTREAM_MODULES = {"reviewer"}


# ── Base class ────────────────────────────────────────────────────────────────

class ModulePipeline(ABC):
    """Abstract base for a single module's generation logic."""

    name: str = ""
    display_name: str = ""
    needs_upstream: list[str] = []

    @abstractmethod
    def build_prompt(self, discovery: dict, upstream: dict) -> Tuple[str, str]:
        """Return (system_prompt, user_prompt) tuple."""

    @abstractmethod
    def parse_response(self, raw: Optional[dict]) -> list:
        """Extract the artifact list from the LLM JSON response."""

    def upstream_artifact_key(self) -> Optional[str]:
        """Which artifact key to inject as upstream JSON. None = discovery only."""
        if self.name in EPICS_UPSTREAM_MODULES:
            return "epic_map"
        if self.name in STORIES_UPSTREAM_MODULES:
            return "user_stories"
        if self.name in ALL_UPSTREAM_MODULES:
            return None  # gets full upstream dict
        return None


class EpicMapPipeline(ModulePipeline):
    name = "epic_map"
    display_name = "Epic Map"
    needs_upstream = []

    def build_prompt(self, discovery: dict, upstream: dict) -> Tuple[str, str]:
        return build_epic_prompt(discovery)

    def parse_response(self, raw: Optional[dict]) -> list:
        if raw is None:
            return []
        if isinstance(raw, list):
            return raw
        return raw.get("epics", raw.get("epic_map", []))


class UserStoriesPipeline(ModulePipeline):
    name = "user_stories"
    display_name = "User Stories"
    needs_upstream = ["epic_map"]

    def build_prompt(self, discovery: dict, upstream: dict) -> Tuple[str, str]:
        epic_json = json.dumps(upstream.get("epic_map", []))
        return build_user_stories_prompt(discovery, epic_json)

    def parse_response(self, raw: Optional[dict]) -> list:
        if raw is None:
            return []
        if isinstance(raw, list):
            return raw
        return raw.get("user_stories", raw.get("stories", []))


class QAScenariosPipeline(ModulePipeline):
    name = "qa_scenarios"
    display_name = "QA Scenarios"
    needs_upstream = ["user_stories"]

    def build_prompt(self, discovery: dict, upstream: dict) -> Tuple[str, str]:
        stories_json = json.dumps(upstream.get("user_stories", []))
        return build_qa_prompt(discovery, stories_json)

    def parse_response(self, raw: Optional[dict]) -> list:
        if raw is None:
            return []
        if isinstance(raw, list):
            return raw
        for key in ("qa_scenarios", "scenarios", "tests", "items"):
            if key in raw and isinstance(raw[key], list):
                return raw[key]
        return []


class AnalyticsPipeline(ModulePipeline):
    name = "analytics"
    display_name = "Analytics Events"
    needs_upstream = ["user_stories"]

    def build_prompt(self, discovery: dict, upstream: dict) -> Tuple[str, str]:
        stories_json = json.dumps(upstream.get("user_stories", []))
        return build_analytics_prompt(discovery, stories_json)

    def parse_response(self, raw: Optional[dict]) -> list:
        if raw is None:
            return []
        if isinstance(raw, list):
            return raw
        return raw.get("analytics_events", raw.get("events", []))


class RisksPipeline(ModulePipeline):
    name = "risks"
    display_name = "Risks"
    needs_upstream = ["epic_map"]

    def build_prompt(self, discovery: dict, upstream: dict) -> Tuple[str, str]:
        epic_json = json.dumps(upstream.get("epic_map", []))
        return build_risks_prompt(discovery, epic_json)

    def parse_response(self, raw: Optional[dict]) -> list:
        if raw is None:
            return []
        if isinstance(raw, list):
            return raw
        return raw.get("risks", raw.get("risks_list", []))


class ReviewerPipeline(ModulePipeline):
    name = "reviewer"
    display_name = "AI Review"
    needs_upstream = ["epic_map", "user_stories", "qa_scenarios", "analytics", "risks"]

    def build_prompt(self, discovery: dict, upstream: dict) -> Tuple[str, str]:
        return build_reviewer_prompt(discovery, upstream)

    def parse_response(self, raw: Optional[dict]) -> list:
        if raw is None:
            return []
        if isinstance(raw, list):
            return raw
        return raw.get("reviewer_items", raw.get("reviews", []))


# ── Registry map ─────────────────────────────────────────────────────────────

_MODULES = {
    "epic_map": EpicMapPipeline(),
    "user_stories": UserStoriesPipeline(),
    "qa_scenarios": QAScenariosPipeline(),
    "analytics": AnalyticsPipeline(),
    "risks": RisksPipeline(),
    "reviewer": ReviewerPipeline(),
}


def get_module(name: str) -> Optional[ModulePipeline]:
    return _MODULES.get(name)


# ── Core orchestrator ─────────────────────────────────────────────────────────

async def generate_single_module(
    workbench_id: str,
    module_name: str,
    discovery: dict,
    upstream: dict,
) -> AsyncGenerator[dict, None]:
    """
    Generate one module's artifacts and yield SSE-compatible dict events.

    Yields:
        {"event": "module_start", "data": module_name}
        {"event": "prerequisite_missing", "data": upstream_key}
        {"event": "module_data", "data": json_string_of_{module: parsed_list}}
        {"event": "module_complete", "data": module_name}
        {"event": "error", "data": error_message}
        {"event": "generation_done", "data": module_name}
    """
    pipeline = get_module(module_name)
    if pipeline is None:
        yield {"event": "error", "data": f"Unknown module: {module_name}"}
        return

    yield {"event": "module_start", "data": module_name}

    # Check prerequisites
    for dep in pipeline.needs_upstream:
        if not upstream.get(dep):
            yield {"event": "prerequisite_missing", "data": dep}
            return

    try:
        system, user_prompt = pipeline.build_prompt(discovery, upstream)
        raw = await generate_json(system, user_prompt)
        parsed = pipeline.parse_response(raw)

        if not parsed and raw is None:
            yield {"event": "error", "data": f"{pipeline.display_name} generation failed: no response from LLM"}
            return

        yield {"event": "module_data", "data": json.dumps({module_name: parsed})}
        yield {"event": "module_complete", "data": module_name}

    except Exception as e:
        yield {"event": "error", "data": f"{pipeline.display_name} generation failed: {str(e)}"}

    yield {"event": "generation_done", "data": module_name}