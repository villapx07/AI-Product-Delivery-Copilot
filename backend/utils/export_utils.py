"""
Export utilities: Markdown, JSON, Jira CSV formats for all artifact types.
"""
import csv
import io
import json
from typing import Any


def export_markdown(artifacts: dict[str, Any], feature_title: str = "") -> str:
    """Export all artifacts as formatted Markdown."""
    lines = [f"# {feature_title or 'Product Delivery Artifacts'}"]
    lines.append("")

    # Epic Map
    epics = artifacts.get("epic_map", [])
    if epics:
        lines.append("## 📋 Epic Map\n")
        lines.append("| Epic | Description | Teams | Dependencies | Priority |")
        lines.append("|------|-------------|-------|-------------|----------|")
        for e in epics:
            teams = ", ".join(e.get("teams", []))
            lines.append(f"| **{e.get('title', '')}** | {e.get('description', '')} | {teams} | {e.get('dependencies', '')} | {e.get('priority', '')} |")
        lines.append("")

    # User Stories
    stories = artifacts.get("user_stories", [])
    if stories:
        lines.append("## 📝 User Stories\n")
        current_epic = None
        for s in stories:
            epic = s.get("epicId", "")
            if epic != current_epic:
                lines.append(f"\n### Epic: {epic}\n")
                current_epic = epic
            lines.append(f"**As a** {s.get('user', '')} **I want** {s.get('goal', '')} **So that** {s.get('benefit', '')}\n")
            lines.append("*Acceptance Criteria:*")
            for c in s.get("criteria", []):
                ctype = c.get("type", "")
                label = {"happy": "✅", "negative": "❌", "edge": "⚠️"}.get(ctype, "•")
                lines.append(f"- {label} {c.get('text', '')}")
            lines.append("")
        lines.append("")

    # QA Scenarios
    qa = artifacts.get("qa_scenarios", [])
    if qa:
        lines.append("## ✅ QA Test Scenarios\n")
        for q in qa:
            icon = {"positive": "✅", "negative": "❌", "edge": "⚠️", "validation": "🔍"}.get(q.get("type", ""), "•")
            lines.append(f"### {icon} {q.get('title', '')}")
            lines.append(f"**Type:** {q.get('type', '')}")
            lines.append(f"**Preconditions:** {q.get('preconditions', '')}")
            lines.append(f"**Steps:**\n{q.get('steps', '')}")
            lines.append(f"**Expected Result:** {q.get('expectedResult', '')}")
            lines.append("")
        lines.append("")

    # Analytics Events
    analytics = artifacts.get("analytics_events", [])
    if analytics:
        lines.append("## 📊 Analytics Events\n")
        lines.append("| Event Name | Trigger | Purpose | Funnel Stage |")
        lines.append("|------------|---------|---------|---------------|")
        for a in analytics:
            lines.append(f"| `{a.get('eventName', '')}` | {a.get('trigger', '')} | {a.get('purpose', '')} | {a.get('funnelStage', '')} |")
        lines.append("")

    # Risks
    risks = artifacts.get("risks", [])
    if risks:
        lines.append("## ⚠️ Risks & Dependencies\n")
        for r in risks:
            sev = r.get("severity", "")
            sev_icon = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(sev, "⚪")
            lines.append(f"- {sev_icon} **[{r.get('type', '').upper()}]** {r.get('text', '')}")
            if r.get("suggestedAction"):
                lines.append(f"  - *Action:* {r.get('suggestedAction', '')}")
        lines.append("")

    return "\n".join(lines)


def export_json(artifacts: dict[str, Any], feature_title: str = "") -> str:
    """Export all artifacts as formatted JSON."""
    return json.dumps(artifacts, indent=2, ensure_ascii=False)


def export_jira_csv(artifacts: dict[str, Any]) -> str:
    """Export User Stories + QA as Jira-compatible CSV."""
    rows = []

    for s in artifacts.get("user_stories", []):
        summary = f"As a {s.get('user', '')}, I want {s.get('goal', '')}"
        description = f"{s.get('benefit', '')}\n\nAcceptance Criteria:\n"
        for c in s.get("criteria", []):
            description += f"- {c.get('text', '')}\n"
        rows.append({
            "Issue Type": "Story",
            "Summary": summary,
            "Description": description.strip(),
            "Priority": "Medium",
            "Epic": s.get("epicId", ""),
        })

    for q in artifacts.get("qa_scenarios", []):
        rows.append({
            "Issue Type": "Test",
            "Summary": q.get("title", ""),
            "Description": f"Preconditions: {q.get('preconditions', '')}\n\nSteps:\n{q.get('steps', '')}\n\nExpected: {q.get('expectedResult', '')}",
            "Priority": "Medium",
            "Labels": f"qa,{q.get('type', '')}",
        })

    if not rows:
        return ""
    headers = list(rows[0].keys())

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue()