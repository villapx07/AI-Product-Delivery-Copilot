import os
import json
from pathlib import Path
from typing import Optional, Tuple

PROMPTS_DIR = Path(__file__).parent / "prompts"


def load_prompt(module: str) -> str:
    """Load a prompt template from the prompts directory."""
    path = PROMPTS_DIR / f"{module}.txt"
    if path.exists():
        return path.read_text()
    return ""


def build_input_summary(req) -> str:
    """Build a text summary of the inputs for prompting.

    Handles both legacy request objects (with .feature_title attribute access)
    and the new dict-based discovery inputs from the modular pipeline.
    """
    feature_title = getattr(req, 'feature_title', req.get('feature_title', '')) if isinstance(req, dict) else req.feature_title
    business_objective = getattr(req, 'business_objective', req.get('business_objective', '')) if isinstance(req, dict) else req.business_objective

    lines = [f"Feature Title: {feature_title}"]
    lines.append(f"Business Objective: {business_objective}")

    # Handle dict-style access
    def get_field(r, key):
        if isinstance(r, dict):
            return r.get(key, '')
        return getattr(r, key, '')

    problem = get_field(req, 'problem_statement')
    if problem:
        lines.append(f"Problem Statement: {problem}")

    metrics = get_field(req, 'success_metrics')
    if metrics:
        lines.append(f"Success Metrics: {metrics}")

    constraints = get_field(req, 'constraints')
    if constraints:
        lines.append(f"Constraints: {constraints}")

    assumptions = get_field(req, 'assumptions')
    if assumptions:
        lines.append(f"Assumptions: {assumptions}")

    impacted = get_field(req, 'impacted_teams')
    if impacted:
        teams = impacted if isinstance(impacted, list) else impacted.split(',')
        lines.append(f"Impacted Teams: {', '.join(teams)}")

    # Legacy: uploaded files
    uploaded = get_field(req, 'uploaded_files')
    file_names = get_field(req, 'file_names')
    if uploaded and file_names:
        fnames = file_names if isinstance(file_names, list) else file_names.split(',')
        lines.append(f"Uploaded Files: {', '.join(fnames)}")

    return "\n".join(lines)


# ── Epic Map ──────────────────────────────────────────────────────────────────

def build_epic_prompt(req) -> Tuple[str, str]:
    system = load_prompt("epic_map")
    context = build_input_summary(req)
    user = f"""Generate an Epic Map for the following feature:

{context}

Return JSON array of epics."""
    return system, user


# ── User Stories ─────────────────────────────────────────────────────────────

def build_user_stories_prompt(req, epic_map_json: str) -> Tuple[str, str]:
    system = load_prompt("user_stories")
    context = build_input_summary(req)
    user = f"""Generate user stories for the following feature and epic map:

{context}

Epic Map (JSON):
{epic_map_json}

Return JSON array of user stories."""
    return system, user


# ── QA Scenarios ──────────────────────────────────────────────────────────────

def build_qa_prompt(req, user_stories_json: str) -> Tuple[str, str]:
    system = load_prompt("qa_scenarios")
    context = build_input_summary(req)
    user = f"""Generate QA test scenarios for the following feature and user stories:

{context}

User Stories (JSON):
{user_stories_json}

Return JSON array of test scenarios."""
    return system, user


# ── Analytics ────────────────────────────────────────────────────────────────

def build_analytics_prompt(req, user_stories_json: str) -> Tuple[str, str]:
    system = load_prompt("analytics")
    context = build_input_summary(req)
    user = f"""Generate analytics events for the following feature:

{context}

User Stories (JSON):
{user_stories_json}

Return JSON array of analytics events."""
    return system, user


# ── Risks ─────────────────────────────────────────────────────────────────────

def build_risks_prompt(req, epic_map_json: str = "[]") -> Tuple[str, str]:
    system = load_prompt("risks")
    context = build_input_summary(req)
    user = f"""Identify risks and dependencies for the following feature and epic map:

{context}

Epic Map (JSON):
{epic_map_json}

Return JSON array of risk items."""
    return system, user


# ── Reviewer ──────────────────────────────────────────────────────────────────

def build_reviewer_prompt(req, all_artifacts: dict = None) -> Tuple[str, str]:
    """Build the reviewer prompt.

    req: discovery inputs dict (from modular pipeline) or legacy request object
    all_artifacts: dict of {artifact_type: data} for context injection
    """
    system = load_prompt("reviewer")
    context = build_input_summary(req)

    artifacts = all_artifacts or {}

    epic_map_json = json.dumps(artifacts.get('epic_map', []), indent=2)
    user_stories_json = json.dumps(artifacts.get('user_stories', []), indent=2)
    qa_json = json.dumps(artifacts.get('qa_scenarios', []), indent=2)
    analytics_json = json.dumps(artifacts.get('analytics', []), indent=2)
    risks_json = json.dumps(artifacts.get('risks', []), indent=2)

    user = f"""You are an AI delivery governance reviewer. Analyze the generated artifacts and identify:
- Inconsistencies and gaps
- Missing logic and undefined flows
- Compliance and risk gaps
- Conflicting assumptions
- Missing edge cases

{context}

Epic Map:
{epic_map_json}

User Stories:
{user_stories_json}

QA Scenarios:
{qa_json}

Analytics Events:
{analytics_json}

Risks:
{risks_json}

Return JSON array of review findings. Each finding should have:
- severity: "critical" | "major" | "minor"
- category: "inconsistency" | "gap" | "risk" | "compliance" | "assumption"
- title: short description
- description: detailed explanation
- recommendation: suggested fix or next step
"""
    return system, user