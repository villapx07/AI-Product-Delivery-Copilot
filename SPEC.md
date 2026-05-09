# AI Product Delivery Copilot — MVP V1

## 1. Concept & Vision

An **intelligent product delivery workspace** — not a chatbot — that acts like a senior product analyst embedded in your team. Given a product idea and optional documents/screenshots, it generates structured delivery artifacts (epic maps, user stories, QA scenarios, analytics events, risk checklists) that are immediately editable, exportable, and ready for sprint planning.

The product optimizes for **delivery clarity**: structuring thinking, exposing gaps, reducing ambiguity, and accelerating alignment — not just document generation.

---

## 2. Design Language

### Aesthetic Direction
**"Structured Intelligence"** — clean, functional, developer-grade UI with a workspace feel. Inspired by Linear's task views and Notion's block-based editing. Light theme with sharp typography. Dense information hierarchy with breathing room where it matters.

### Color Palette
```
Background:      #FAFAFA (main canvas)
Surface:         #FFFFFF (cards, panels)
Border:          #E4E4E7 (zinc-200)
Text Primary:    #18181B (zinc-900)
Text Secondary:  #71717A (zinc-500)
Accent:          #6366F1 (indigo-500) — primary actions, active states
Accent Subtle:   #EEF2FF (indigo-50) — hover states, active tabs
Success:         #10B981 (emerald-500)
Warning:         #F59E0B (amber-500)
Danger:          #EF4444 (red-500)
AI Reviewer:     #8B5CF6 (violet-500) — reviewer panel accent
```

### Typography
- **Headings:** Inter (700) — sharp, professional
- **Body:** Inter (400/500) — highly legible at small sizes
- **Code/Mono:** JetBrains Mono — user story formatting, export previews
- Scale: 12px (caption) → 14px (body) → 16px (subhead) → 20px (section) → 28px (page)

### Spatial System
- Base unit: 4px
- Panel gaps: 16px
- Card padding: 20px
- Section spacing: 32px
- Dense lists: 8px item spacing

### Motion Philosophy
- **Functional only** — no decorative animations
- Tab transitions: 150ms ease-out opacity + 2px translate
- Streaming text: character-by-character reveal (40ms/char) for AI output
- Panel expand/collapse: 200ms ease-in-out
- Hover states: 100ms color transitions

---

## 3. Layout & Structure

### Three-Panel Workspace

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HEADER: Logo | Project Name | Export | Settings                       │
├───────────────┬─────────────────────────────────────┬────────────────────┤
│               │                                     │                    │
│  LEFT PANEL   │         CENTER PANEL                │   RIGHT PANEL      │
│  (320px)      │         (flex-grow)                 │   (300px)          │
│               │                                     │                    │
│  • Discovery  │  [Tab Bar: Epic | Stories | QA |   │   AI REVIEWER      │
│    Form       │   Analytics | Risks]               │                    │
│               │                                     │   Continuous       │
│  • File       │  [Tab Content Area]                │   gap analysis     │
│    Upload     │                                     │                    │
│               │  Output cards with inline edit      │   • Missing logic  │
│  • Generate   │  Streaming artifacts               │   • Risk flags     │
│    Button     │  Per-section regenerate            │   • Assumptions    │
│               │                                     │   • Stakeholder     │
│  • History    │  Export buttons per section        │     reminders      │
│               │                                     │                    │
└───────────────┴─────────────────────────────────────┴────────────────────┘
```

### Responsive Strategy
- ≥1280px: Full three-panel layout
- 768–1279px: Left panel collapses to icon rail, right panel slides over
- <768px: Single column, panels stack as accordions

### Visual Pacing
- Left panel: dense, form-based, compact
- Center panel: spacious, card-based outputs with clear hierarchy
- Right panel: subtle highlight background, checklist format

---

## 4. Features & Interactions

### 4.1 Discovery Input (Left Panel)

**Fields:**
- Feature Title (required, text)
- Business Objective (required, textarea)
- Problem Statement (optional, textarea)
- Success Metrics (optional, textarea, multi-line)
- Constraints (optional, textarea)
- Rollout Assumptions (optional, textarea)
- Impacted Teams (multi-select checkboxes):
  - Product, UX, Engineering, Data, Analytics, Finance, Accounting, Security, Privacy, Compliance, CRM, Operations

**Upload Zone:**
- Drag-and-drop area for images/screenshots
- Or click to browse
- Shows thumbnail previews with remove button
- Accepted: PNG, JPG, WEBP, PDF (first page converted to image)
- Max 5 files, 10MB each

**Generate Button:**
- Disabled until Feature Title + Business Objective are filled
- On click: streams output to center panel progressively
- Shows spinner + "Analyzing inputs..." during initial processing

**Session History:**
- Previous generations stored in localStorage
- Expandable list, click to reload into workspace
- Clear all option

### 4.2 Center Panel — Tabbed Outputs

**Tab Bar:** Epic Map | User Stories | QA | Analytics | Risks

Each tab content:
- **Section Header**: Title + "Regenerate" button + "Copy" button
- **Streaming Output**: Text appears progressively
- **Edit Mode**: Click any block to edit inline (contenteditable)
- **Export**: Per-section export dropdown (Markdown, JSON, Jira CSV)

#### Epic Map Tab
Columns: Epic | Description | Suggested Teams | Dependencies | Priority
- Inline editing on all cells
- Color-coded priority badges (P0=red, P1=amber, P2=blue)
- Drag-to-reorder rows

#### User Stories Tab
Grouped by Epic with collapsible sections.

Each story card:
```
[Epic Label] [Story #]

USER STORY:
As a [user]
I want [goal]
So that [benefit]

ACCEPTANCE CRITERIA:
✓ Given [context] When [action] Then [result]
✓ Happy path
✓ Negative scenario
✓ Edge case
```
- Inline editing on all text
- Add/remove criteria buttons
- Color left-border by epic

#### QA Test Scenarios Tab
Grouped: Positive | Negative | Edge Cases | Validation

Each scenario:
```
[Test #] [Test Title]
Type: Positive
Pre-conditions: ...
Test Steps: ...
Expected Result: ...
```
- Inline editable
- Add/remove scenario buttons

#### Analytics Events Tab
Table format:
Event Name | Trigger | Purpose | Funnel Stage

- Sortable columns
- Inline editable cells
- Add/remove row buttons

#### Risks & Dependencies Tab
Checklist format with severity badges:
- 🔴 High
- 🟡 Medium
- 🟢 Low

Categories: Technical | Compliance | Operational | Stakeholder | Assumptions

Each item:
```
[ ] [Risk/Dependency description]
Type: Technical | Suggested action: ...
```

### 4.3 AI Reviewer Panel (Right Panel)

**Header:** "AI Reviewer" with continuous evaluation badge

**Content:** Scrollable list of review cards

Each review card:
```
[Icon] [Category]

[Review message]
```

**Categories:**
- 🔴 Missing Logic — incomplete requirements detected
- 🟡 Unclear Assumption — needs clarification
- 🔵 Risk Flag — potential implementation risk
- 🟣 Stakeholder Gap — suggested reviewer missing
- ✅ Completeness — artifact is solid

**Behavior:**
- Updates progressively as each module generates
- Items dismissable (user addressed the gap)
- Collapsible sections by category

### 4.4 Export Functionality

**Per-section export:**
- Markdown — clean markdown with headers and lists
- JSON — structured data object
- Jira CSV — Jira-importable format with Epic/Story labels

**Full project export:**
- "Export All" button in header
- Generates a .zip with:
  - `epic-map.md`
  - `user-stories.md`
  - `qa-scenarios.md`
  - `analytics-events.md`
  - `risks.md`
  - `project.json` (full structured data)

### 4.5 Inline Editing

- All generated content is editable inline
- Click to focus, content becomes contenteditable
- Auto-save to local state on blur
- "Reset to AI-generated" option appears after edit
- No unsaved changes warning needed (stateless MVP)

### 4.6 Regeneration

- "Regenerate" button per section
- Re-sends same inputs to AI with section-specific prompt
- Shows brief "Regenerating..." state
- Replaces section content, preserving edits user made before regenerate

---

## 5. Component Inventory

### Input Components
| Component | States | Notes |
|-----------|--------|-------|
| TextInput | default, focused, filled, error | Required field indicator |
| TextArea | default, focused, filled | Auto-grow to content |
| MultiSelect | default, open, selected | Team checkboxes |
| FileUpload | empty, dragging, uploaded, error | Preview thumbnails |
| PrimaryButton | disabled, default, loading | Generate button |
| IconButton | default, hover, active | Copy/Regenerate/Export |

### Output Components
| Component | States | Notes |
|-----------|--------|-------|
| TabBar | tab: default/active/hover | Underline active indicator |
| StoryCard | default, editing, saved | Left border color by epic |
| TableEditable | default, editing cell | Cell-level edit mode |
| RiskItem | default, checked, high/med/low | Severity badge |
| StreamingText | streaming, complete | Character reveal animation |
| ExportDropdown | closed, open, exporting | Per-section export |

### Layout Components
| Component | States | Notes |
|-----------|--------|-------|
| LeftPanel | expanded, collapsed | Collapsible on small screens |
| RightPanel | visible, hidden | AI Reviewer, collapsible |
| PanelHeader | default | Sticky within panel |

---

## 6. Technical Approach

### Stack
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** FastAPI (Python), uvicorn
- **AI Layer:** OpenAI-compatible API (configurable provider: OpenAI, Azure, local)
- **Storage:** SQLite (MVP) via SQLAlchemy for persistence
- **Streaming:** Server-Sent Events (SSE)

### Architecture

```
Browser (Next.js)
    │
    ▼ POST /api/generate (SSE)
FastAPI (Python)
    │
    ├── Prompt Orchestration
    │   ├── system_prompts/module_*.txt
    │   └── generation_context.py
    │
    ├── LLM Adapter
    │   └── llm_client.py (OpenAI-compatible)
    │
    ├── Storage
    │   └── database.py (SQLite)
    │
    └── File Handler
        └── upload_handler.py (local filesystem)
```

### API Endpoints

```
POST /api/generate
  Body: { feature_title, business_objective, problem_statement,
          success_metrics, constraints, assumptions,
          impacted_teams[], uploaded_files[] }
  Response: SSE stream of { module, status, content, reviewer_items }

POST /api/regenerate
  Body: { module, inputs }
  Response: SSE stream

POST /api/export
  Body: { format: 'markdown'|'json'|'jira', module: string }
  Response: file download

GET /api/history
  Response: [{ id, title, created_at, summary }]

GET /api/project/{id}
  Response: full project data

POST /api/upload
  Body: multipart/form-data (file)
  Response: { file_id, preview_url }
```

### Data Model

```python
Project:
  id: UUID
  feature_title: str
  business_objective: str
  created_at: datetime
  updated_at: datetime

  # Generated artifacts (JSON text)
  epic_map: str
  user_stories: str
  qa_scenarios: str
  analytics_events: str
  risks: str

  # Metadata
  impacted_teams: list[str]
  files: list[str]
```

### Prompt Architecture

Each module has a dedicated prompt template:
```
prompts/epic_map.txt      — Epic generation instructions
prompts/user_stories.txt  — User story format + AC rules
prompts/qa_scenarios.txt  — Test case structure
prompts/analytics.txt     — Event instrumentation guide
prompts/risks.txt         — Risk identification framework
prompts/reviewer.txt      — Reviewer evaluation logic
```

### Streaming Implementation

- Backend: FastAPI `StreamingResponse` with SSE
- Frontend: `EventSource` API or `fetch` with `ReadableStream`
- Each chunk: `{ type: 'module_start'|'chunk'|'reviewer'|'complete', data: ... }`
- Module completion triggers tab activation in UI

### File Upload

- Stored in `/uploads/{project_id}/{file_id}.{ext}`
- Base64 preview in browser for images
- PDF: first page converted to image via pdf2image (optional, can skip for MVP)

### MVP Scope Boundaries

**Included:**
- Core 6-module generation
- Inline editing
- Streaming output
- Per-module export (MD/JSON/Jira)
- File upload + image analysis
- Session history (localStorage)
- AI Reviewer panel
- Full project export (.zip)

**Not included (V2+):**
- User authentication / permissions
- Jira API integration
- Google Docs integration
- Figma API
- Organizational memory
- Multi-user collaboration
- Cloud deployment / Docker

---

## 7. File Structure

```
AI-Product-Delivery-Copilot/
├── SPEC.md
├── README.md
├── frontend/                    # Next.js app
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx          # Main workspace
│   │   │   └── api/
│   │   │       ├── generate/
│   │   │       │   └── route.ts
│   │   │       ├── export/
│   │   │       │   └── route.ts
│   │   │       └── upload/
│   │   │           └── route.ts
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── LeftPanel.tsx
│   │   │   │   ├── CenterPanel.tsx
│   │   │   │   ├── RightPanel.tsx
│   │   │   │   └── Header.tsx
│   │   │   ├── inputs/
│   │   │   │   ├── DiscoveryForm.tsx
│   │   │   │   └── FileUpload.tsx
│   │   │   ├── outputs/
│   │   │   │   ├── EpicMap.tsx
│   │   │   │   ├── UserStories.tsx
│   │   │   │   ├── QAScenarios.tsx
│   │   │   │   ├── AnalyticsEvents.tsx
│   │   │   │   └── Risks.tsx
│   │   │   ├── reviewer/
│   │   │   │   └── AIReviewer.tsx
│   │   │   └── ui/
│   │   │       ├── Button.tsx
│   │   │       ├── Input.tsx
│   │   │       ├── Tabs.tsx
│   │   │       ├── Card.tsx
│   │   │       └── ExportMenu.tsx
│   │   ├── hooks/
│   │   │   ├── useStreaming.ts
│   │   │   └── useProject.ts
│   │   └── lib/
│   │       ├── api.ts
│   │       └── utils.ts
├── backend/                     # FastAPI app
│   ├── requirements.txt
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── llm_client.py
│   ├── prompt_orchestrator.py
│   ├── prompts/
│   │   ├── epic_map.txt
│   │   ├── user_stories.txt
│   │   ├── qa_scenarios.txt
│   │   ├── analytics.txt
│   │   ├── risks.txt
│   │   └── reviewer.txt
│   ├── routers/
│   │   ├── generate.py
│   │   ├── export.py
│   │   └── upload.py
│   └── uploads/                 # File storage
├── .gitignore
└── setup.sh                     # One-command setup
```