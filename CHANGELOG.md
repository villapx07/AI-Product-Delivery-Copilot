# Changelog

All notable changes to the AI Product Delivery Copilot are documented here.

## [v0.2.0] — 2026-05-10

### Fixed
- Model dropdown replaced free-text field in Settings modal (MiniMax: Minimax2.7, MiniMax-Text-01, MiniMax-Image-01; OpenAI: GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-4)
- Config field name mismatch: frontend camelCase (`apiKey`, `baseUrl`) now correctly maps to backend snake_case (`api_key`, `base_url`)
- Config now loads from backend on page mount — modal pre-fills with saved values
- Generate button now shows explicit error toasts when: required fields missing, no API key configured, backend unreachable, HTTP errors, or stream failures
- Generate button now shows success toast when all modules complete

### Added
- Toast notification system: error (red), success (green), info (neutral) — auto-dismisses after 4.5s
- Progress label on Generate button: shows current module being generated ("Generating epic_map..." etc.)
- `/how-to-use` guide page with step-by-step instructions and troubleshooting
- Help button (❓) in header, beside Export All, linking to `/how-to-use`
- `CHANGELOG.md` for tracking changes

## [v0.1.0] — 2026-05-09

### Added
- MVP v1: 3-panel workspace (Discovery inputs left, 5 output modules center, AI Reviewer right)
- FastAPI backend with OpenAI + MiniMax multi-provider LLM support
- Module-by-module SSE streaming from backend to frontend
- LLM Settings modal (provider switcher, API key, base URL, model)
- Left panel: DiscoveryForm + FileUpload + Session History
- Center panel tabs: Epic Map, User Stories, QA Scenarios, Analytics Events, Risks
- AI Reviewer panel with gap analysis (missing logic, risks, assumptions, completeness)
- Per-module inline editing, copy, and export
- Export All (zip), Markdown, JSON, Jira CSV export
- SQLite session storage
- launchd watchdog for Vera-Hermes bridge
