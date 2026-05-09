import os
import json
from pathlib import Path
from typing import Optional

PROMPTS_DIR = Path(__file__).parent / "prompts"


def load_prompt(module: str) -> str:
    """Load a prompt template from the prompts directory."""
    path = PROMPTS_DIR / f"{module}.txt"
    if path.exists():
        return path.read_text()
    return ""


def build_input_summary(req) -> str:
    """Build a text summary of the inputs for prompting."""
    lines = [f"Feature Title: {req.feature_title}"]
    lines.append(f"Business Objective: {req.business_objective}")
    if req.problem_statement:
        lines.append(f"Problem Statement: {req.problem_statement}")
    if req.success_metrics:
        lines.append(f"Success Metrics: {req.success_metrics}")
    if req.constraints:
        lines.append(f"Constraints: {req.constraints}")
    if req.assumptions:
        lines.append(f"Assumptions: {req.assumptions}")
    if req.impacted_teams:
        lines.append(f"Impacted Teams: {', '.join(req.impacted_teams)}")
    if req.uploaded_files and req.file_names:
        lines.append(f"Uploaded Files: {', '.join(req.file_names)}")
    return "\n".join(lines)


def build_epic_prompt(req) -> str:
    system = load_prompt("epic_map")
    context = build_input_summary(req)
    user = f"""Generate an Epic Map for the following feature:

{context}

Return JSON array of epics."""
    return system, user


def build_user_stories_prompt(req, epic_map_json: str) -> str:
    system = load_prompt("user_stories")
    context = build_input_summary(req)
    user = f"""Generate user stories for the following feature and epic map:

{context}

Epic Map (JSON):
{epic_map_json}

Return JSON array of user stories."""
    return system, user


def build_qa_prompt(req, user_stories_json: str) -> str:
    system = load_prompt("qa_scenarios")
    context = build_input_summary(req)
    user = f"""Generate QA test scenarios for the following feature and user stories:

{context}

User Stories (JSON):
{user_stories_json}

Return JSON array of test scenarios."""
    return system, user


def build_analytics_prompt(req, user_stories_json: str) -> str:
    system = load_prompt("analytics")
    context = build_input_summary(req)
    user = f"""Generate analytics events for the following feature:

{context}

User Stories (JSON):
{user_stories_json}

Return JSON array of analytics events."""
    return system, user


def build_risks_prompt(req, epic_map_json: str) -> str:
    system = load_prompt("risks")
    context = build_input_summary(req)
    user = f"""Identify risks and dependencies for the following feature and epic map:

{context}

Epic Map (JSON):
{epic_map_json}

Return JSON array of risk items."""
    return system, user


def build_reviewer_prompt(req, all_artifacts: dict) -> str:
    system = load_prompt("reviewer")
    context = build_input_summary(req)
    user = f"""Review the following generated artifacts and identify gaps, risks, and areas for improvement:

{context}

Epic Map:
{json.dumps(all_artifacts.get('epic_map', []), indent=2)}

User Stories:
{json.dumps(all_artifacts.get('user_stories', []), indent=2)}

QA Scenarios:
{json.dumps(all_artifacts.get('qa_scenarios', []), indent=2)}

Analytics Events:
{json.dumps(all_artifacts.get('analytics_events', []), indent=2)}

Risks:
{json.dumps(all_artifacts.get('risks', []), indent=2)}

Return JSON array of review items."""
    return system, user