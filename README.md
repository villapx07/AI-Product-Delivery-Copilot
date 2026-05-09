# AI Product Delivery Copilot — MVP V1

> An intelligent product delivery workspace that helps fintech product teams accelerate requirement generation, stakeholder mapping, and delivery clarity.

![MVP](https://img.shields.io/badge/version-1.0.0-blue) ![Status](https://img.shields.io/badge/status-MVP-green)

---

## 🎯 What It Does

Given a **product idea, business objective, and optional screenshots/docs**, this AI-powered workspace generates:

- 📋 **Epic Map** — structured delivery epics with owners, dependencies, priorities
- 📝 **User Stories** — structured in Gherkin format with acceptance criteria
- ✅ **QA Test Scenarios** — positive, negative, edge, and validation cases
- 📊 **Analytics Events** — instrumentation recommendations with funnel mapping
- ⚠️ **Risks & Dependencies** — implementation risks, compliance flags, stakeholder gaps
- 🤖 **AI Reviewer** — continuous gap analysis like a senior PM reviewing your draft

---

## 🏗️ Architecture

```
┌─────────────────────┐      ┌─────────────────────┐
│   Next.js Frontend  │ ←──→ │   FastAPI Backend   │
│   (Port 3000)       │ SSE  │   (Port 8000)       │
│                     │      │                     │
│  3-Panel Workspace  │      │  LLM Orchestrator   │
│  - Discovery Input  │      │  OpenAI-compatible  │
│  - Artifact Output │      │  Prompt Templates   │
│  - AI Reviewer     │      │  SQLite Storage     │
└─────────────────────┘      └─────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+
- OpenAI API key (or compatible endpoint)

### 1. Clone & Setup

```bash
cd AI-Product-Delivery-Copilot
./setup.sh
```

### 2. Configure Environment

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Frontend (optional)
cd ../frontend
cp .env.local.example .env.local
```

### 3. Start Services

**Terminal 1 — Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### 4. Open in Browser

```
http://localhost:3000
```

The workspace opens with **demo data preloaded** so you can explore all modules immediately.

---

## 📁 Project Structure

```
AI-Product-Delivery-Copilot/
├── SPEC.md              # Full design specification
├── README.md            # This file
├── setup.sh             # One-command setup script
│
├── frontend/            # Next.js 14 (App Router)
│   ├── src/
│   │   ├── app/         # Pages & API routes
│   │   ├── components/  # UI components (layout, inputs, outputs, reviewer)
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utilities & API client
│   └── package.json
│
└── backend/              # FastAPI
    ├── main.py          # API server + SSE streaming
    ├── models.py        # Pydantic request/response models
    ├── llm_client.py    # OpenAI-compatible LLM adapter
    ├── prompt_orchestrator.py  # Prompt templates + building
    ├── prompts/         # Modular prompt templates
    │   ├── epic_map.txt
    │   ├── user_stories.txt
    │   ├── qa_scenarios.txt
    │   ├── analytics.txt
    │   ├── risks.txt
    │   └── reviewer.txt
    └── requirements.txt
```

---

## 🔑 Key Features

### Discovery Input (Left Panel)
- Feature title, business objective, problem statement, success metrics, constraints, assumptions
- Multi-select impacted teams (Product, UX, Engineering, Data, Analytics, Finance, Security, Privacy, Compliance, CRM, Operations)
- Drag-and-drop file upload for screenshots/Figma exports/ PDFs

### Artifact Outputs (Center Panel)
- **5 tabs**: Epic Map | User Stories | QA Scenarios | Analytics Events | Risks & Dependencies
- All outputs are **inline-editable** (click any cell to edit)
- Per-section **Regenerate** button
- Per-section **Copy** to clipboard

### AI Reviewer (Right Panel)
- Continuous gap analysis as each module generates
- Categories: Missing Logic, Unclear Assumption, Risk Flag, Stakeholder Gap, Completeness
- Dismissable review cards

### Export
- **Per-section**: Markdown, JSON, Jira CSV
- **Export All**: Downloads a `.zip` with all artifacts + `project.json`
- All exports follow **fintech product delivery standards**

---

## 🔧 Configuration

### Environment Variables

**Backend (`backend/.env`):**
```env
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1  # or Azure/OpenRouter endpoint
LLM_MODEL=gpt-4o
PORT=8000
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Using Azure OpenAI

```env
OPENAI_BASE_URL=https://your-resource.openai.azure.com
LLM_MODEL=your-deployment-name
```

### Using Local / Ollama

```env
OPENAI_BASE_URL=http://localhost:11434/v1
LLM_MODEL=llama3
```

---

## 📝 Using with Vera (Optional)

Vera can trigger generation via HTTP:

```bash
curl -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "feature_title": "Instant Loan Approval",
    "business_objective": "Enable borrowers to get approved in under 60 seconds",
    "impacted_teams": ["Product", "Engineering", "Risk", "Compliance"]
  }'
```

The endpoint returns **SSE streaming** — Vera receives module results as they complete.

---

## 🎨 Design System

| Token | Value | Usage |
|-------|-------|-------|
| `accent` | `#6366F1` | Primary actions, active states |
| `reviewer` | `#8B5CF6` | AI Reviewer panel accent |
| `background` | `#FAFAFA` | Canvas background |
| `surface` | `#FFFFFF` | Cards and panels |
| `border` | `#E4E4E7` | Panel and card borders |
| `success` | `#10B981` | Completeness, positive QA |
| `warning` | `#F59E0B` | Edge cases, medium severity |
| `danger` | `#EF4444` | Negative QA, high severity |

**Font:** Inter (body), JetBrains Mono (code/technical)

---

## 🔄 Future Roadmap

**Phase 2:**
- Rich reviewer intelligence with actionable recommendations
- Memory/context retention across sessions
- Reusable project templates

**Phase 3:**
- Jira integration (export directly to Jira)
- Google Docs integration (export to Docs)
- Organizational memory (learn from past projects)
- Architecture intelligence (cross-project pattern recognition)
- Compliance intelligence (regulatory check automation)
- Sprint governance (link artifacts to sprint planning)

---

## ✅ MVP Success Metrics

- Reduce user story drafting time by 60%+
- Reduce clarification cycles between PM and engineering
- Improve requirement completeness (fewer "I didn't think of that" moments)
- Improve QA readiness at sprint start
- Improve PM satisfaction with documentation process

---

## 📄 License

Internal use — Fintech Product Organization

---

Built with ❤️ by the Hermes Agent working alongside ADMIN