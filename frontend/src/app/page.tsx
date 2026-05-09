'use client'

import * as React from 'react'
import { Header } from '@/components/layout/Header'
import { LeftPanel } from '@/components/layout/LeftPanel'
import { CenterPanel } from '@/components/layout/CenterPanel'
import { AIReviewer } from '@/components/reviewer/AIReviewer'
import { SettingsModal } from '@/components/settings/SettingsModal'
import type { DiscoveryInputs } from '@/components/inputs/DiscoveryForm'
import type { Epic } from '@/components/outputs/EpicMap'
import type { UserStory } from '@/components/outputs/UserStories'
import type { QAScenario } from '@/components/outputs/QAScenarios'
import type { AnalyticsEvent } from '@/components/outputs/AnalyticsEvents'
import type { RiskItem } from '@/components/outputs/Risks'

interface UploadedFile {
  id: string
  name: string
  size: number
  preview?: string
  data: string
}

interface Session {
  id: string
  title: string
  date: string
}

// ── Demo / initial state data ───────────────────────────────────
const DEMO_EPICS: Epic[] = [
  {
    id: '1',
    title: 'Instant Loan Approval',
    description: 'Enable eligible users to receive loan approval decisions within 60 seconds of application submission',
    teams: ['Product', 'Engineering', 'Risk', 'Compliance'],
    dependencies: 'Credit scoring service, KYC integration',
    priority: 'P0',
  },
  {
    id: '2',
    title: 'Loan Repayment Dashboard',
    description: 'Provide borrowers with real-time visibility into their repayment schedule, remaining balance, and payment history',
    teams: ['Product', 'UX', 'Engineering'],
    dependencies: 'Core banking ledger, Payment gateway',
    priority: 'P1',
  },
]

const DEMO_STORIES: UserStory[] = [
  {
    id: '1',
    epicId: 'Instant Loan Approval',
    user: 'borrower',
    goal: 'receive a loan decision in under 60 seconds',
    benefit: 'I can plan my finances without uncertainty',
    criteria: [
      { id: 'c1', text: 'User receives decision within 60 seconds of submission', type: 'happy' },
      { id: 'c2', text: 'System shows loading state with progress indicator', type: 'happy' },
      { id: 'c3', text: 'If backend times out, user sees graceful error with retry option', type: 'edge' },
      { id: 'c4', text: 'Rejected application shows reason code, not raw score', type: 'negative' },
    ],
  },
  {
    id: '2',
    epicId: 'Instant Loan Approval',
    user: 'borrower',
    goal: 'upload valid identity documents',
    benefit: 'I can complete KYC verification quickly and securely',
    criteria: [
      { id: 'c5', text: 'User can upload JPG/PNG/PDF up to 10MB', type: 'happy' },
      { id: 'c6', text: 'System validates document format before upload', type: 'edge' },
      { id: 'c7', text: 'Rejected format shows clear error with supported formats', type: 'negative' },
    ],
  },
]

const DEMO_QA: QAScenario[] = [
  {
    id: 'q1',
    title: 'Submit application with all valid inputs',
    type: 'positive',
    preconditions: 'User is authenticated and has no existing loan',
    steps: '1. Navigate to loan application form\n2. Fill all required fields (name, income, loan amount, term)\n3. Accept Terms & Conditions\n4. Click Submit',
    expectedResult: 'Decision returned within 60 seconds with approval or rejection reason displayed',
  },
  {
    id: 'q2',
    title: 'Submit with a missing required field',
    type: 'negative',
    preconditions: 'User has opened the application form',
    steps: '1. Leave "Annual Income" field empty\n2. Fill all other required fields\n3. Click Submit',
    expectedResult: 'Inline validation error shown on the empty field; form not submitted',
  },
  {
    id: 'q3',
    title: 'Upload document in unsupported format',
    type: 'validation',
    preconditions: 'User is on the KYC document upload screen',
    steps: '1. Select a .exe file instead of JPG/PNG/PDF\n2. Click Upload',
    expectedResult: 'Error message: "Unsupported file type. Please upload JPG, PNG or PDF."',
  },
  {
    id: 'q4',
    title: 'Session timeout during application',
    type: 'edge',
    preconditions: 'User has partially filled the application form',
    steps: '1. Fill some fields\n2. Leave browser idle for 30 minutes\n3. Attempt to submit',
    expectedResult: 'Session expired message shown; user redirected to re-login; draft auto-saved for 24h',
  },
]

const DEMO_ANALYTICS: AnalyticsEvent[] = [
  {
    id: 'a1',
    eventName: 'loan_application_started',
    trigger: 'User opens the application form',
    purpose: 'Track how many users begin the application funnel',
    funnelStage: 'awareness',
  },
  {
    id: 'a2',
    eventName: 'loan_application_page_viewed',
    trigger: 'Application form fully loaded in browser',
    purpose: 'Measure drop-off between open and start',
    funnelStage: 'awareness',
  },
  {
    id: 'a3',
    eventName: 'loan_application_submitted',
    trigger: 'User clicks Submit with all valid fields',
    purpose: 'Measure submission rate and identify abandonment',
    funnelStage: 'consideration',
  },
  {
    id: 'a4',
    eventName: 'loan_approval_issued',
    trigger: 'Backend returns APPROVED status',
    purpose: 'Track conversion from submitted to approved',
    funnelStage: 'conversion',
  },
  {
    id: 'a5',
    eventName: 'loan_disbursement_completed',
    trigger: 'Funds transferred to borrower account',
    purpose: 'Confirm actual conversion; measure time to disbursement',
    funnelStage: 'conversion',
  },
]

const DEMO_RISKS: RiskItem[] = [
  {
    id: 'r1',
    text: 'Credit scoring service SLA not guaranteed at 99.9% uptime — may cause timeout during peak hours',
    type: 'technical',
    severity: 'high',
    checked: false,
    suggestedAction: 'Add circuit breaker with fallback to manual review queue + SMS notification to applicant',
  },
  {
    id: 'r2',
    text: 'Regulatory review may require 48h cooling period for first-time borrowers before disbursement',
    type: 'compliance',
    severity: 'medium',
    checked: false,
    suggestedAction: 'Validate with Legal team before launch; add countdown timer in UI during cooling period',
  },
  {
    id: 'r3',
    text: 'KYC provider has rate limits (100 req/min) — peak traffic could trigger 429 errors',
    type: 'operational',
    severity: 'high',
    checked: false,
    suggestedAction: 'Implement async queue with retry; notify user via SMS when KYC completes',
  },
  {
    id: 'r4',
    text: 'Disbursement to unverified bank accounts may trigger fraud / AML alerts',
    type: 'stakeholder',
    severity: 'high',
    checked: false,
    suggestedAction: 'Require bank account verification (name + account match) before any disbursement initiation',
  },
]

const DEMO_REVIEWS = [
  { id: 'rv1', category: 'risk' as const, message: 'Disbursement to unverified accounts — fraud/AML risk flagged. Address before sprint planning.', dismissed: false },
  { id: 'rv2', category: 'stakeholder' as const, message: 'Accounting team not listed in impacted teams — revenue recognition approach needs validation.', dismissed: false },
  { id: 'rv3', category: 'missing' as const, message: 'Retry logic not defined for failed disbursement after approval. What happens to the customer if payout fails?', dismissed: false },
  { id: 'rv4', category: 'assumption' as const, message: '48h regulatory cooling period assumption not yet validated with Legal.', dismissed: false },
  { id: 'rv5', category: 'completeness' as const, message: 'Epic Map covers E2E flow well. Analytics funnel instrumentation is solid.', dismissed: true },
]

type GenerationModule = 'epic_map' | 'user_stories' | 'qa_scenarios' | 'analytics_events' | 'risks' | 'reviewer'

interface ReviewItem {
  id: string
  category: 'missing' | 'assumption' | 'risk' | 'stakeholder' | 'completeness'
  message: string
  dismissed: boolean
}

// ── SSE parsing ────────────────────────────────────────────────
interface SSEEvent {
  event: string
  data: string
}

const DEBUG = true

function parseSSE(chunk: string): SSEEvent | null {
  const eventMatch = chunk.match(/^event: (.+)/)
  const dataMatch = chunk.match(/^data: (.+)/)
  if (!dataMatch) return null
  if (DEBUG) console.log('[SSE]', eventMatch ? eventMatch[1] : 'message', '→', dataMatch[1].slice(0, 80))
  return {
    event: eventMatch ? eventMatch[1] : 'message',
    data: dataMatch[1],
  }
}

// ── Demo seed (remove or set to false to start with blank form) ──
const DEMO_MODE = false

// ── Main page component ─────────────────────────────────────────
export default function WorkspacePage() {
  const [activeTab, setActiveTab] = React.useState('epic')

  const [inputs, setInputs] = React.useState<DiscoveryInputs>({
    feature_title: '',
    business_objective: '',
    problem_statement: '',
    success_metrics: '',
    constraints: '',
    assumptions: '',
    impacted_teams: [],
  })

  const [files, setFiles] = React.useState<UploadedFile[]>([])
  const [sessions] = React.useState<Session[]>([
    { id: '1', title: 'Instant Loan Approval', date: 'May 9, 2026' },
  ])

  // Output state — blank unless demo mode
  const [epicMap, setEpicMap] = React.useState<Epic[]>(DEMO_MODE ? DEMO_EPICS : [])
  const [userStories, setUserStories] = React.useState<UserStory[]>(DEMO_MODE ? DEMO_STORIES : [])
  const [qaScenarios, setQaScenarios] = React.useState<QAScenario[]>(DEMO_MODE ? DEMO_QA : [])
  const [analyticsEvents, setAnalyticsEvents] = React.useState<AnalyticsEvent[]>(DEMO_MODE ? DEMO_ANALYTICS : [])
  const [risks, setRisks] = React.useState<RiskItem[]>(DEMO_MODE ? DEMO_RISKS : [])
  const [reviewItems, setReviewItems] = React.useState<ReviewItem[]>(DEMO_MODE ? DEMO_REVIEWS : [])

  const [isGenerating, setIsGenerating] = React.useState(false)
  const [generatingModule, setGeneratingModule] = React.useState<GenerationModule | null>(null)
  const [isRegenerating, setIsRegenerating] = React.useState<Record<string, boolean>>({})

  // ── Config fetch on mount ─────────────────────────────────────────
  React.useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg.provider && cfg.api_key) {
          setLlmConfig({
            provider: cfg.provider,
            apiKey: cfg.api_key,
            baseUrl: cfg.base_url || '',
            model: cfg.model || (cfg.provider === 'minimax' ? 'MiniMax-Text-01' : 'gpt-4o'),
          })
        }
      })
      .catch(() => {/* config optional, fail silently */})
  }, [])

  // ── Toast notifications ─────────────────────────────────────────
  type Toast = { id: string; message: string; type: 'error' | 'success' | 'info' }
  const [toasts, setToasts] = React.useState<Toast[]>([])
  const addToast = (message: string, type: Toast['type'] = 'info') => {
    const id = `toast-${Date.now()}`
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500)
  }
  const removeToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id))
  const handleInputsChange = (field: keyof DiscoveryInputs, value: string | string[]) => {
    setInputs((prev) => ({ ...prev, [field]: value }))
  }

  // ── Settings modal ──────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [llmConfig, setLlmConfig] = React.useState({
    provider: 'openai' as 'openai' | 'minimax',
    apiKey: '',
    baseUrl: '',
    model: 'gpt-4o',
  })

  const DEBUG = true

  function parseSSE(rawEvent: string): SSEEvent | null {
    // Extract event type and data from an already-separated SSE event block
    // (the block has already been split by \n\n before calling this)
    const eventMatch = rawEvent.match(/(?:^|\n)event: (.+)/)

    const dataMatch = rawEvent.match(/(?:^|\n)data: ([\s\S]+?)(?=\n(?:event|data)|$)/)
    if (!dataMatch) return null
    if (DEBUG) console.log('[SSE]', eventMatch ? eventMatch[1] : 'message', '→', dataMatch[1].slice(0, 80))
    return {
      event: eventMatch ? eventMatch[1] : 'message',
      data: dataMatch[1],
    }
  }

  // ── SSE streaming handler ──────────────────────────────────────
  const handleGenerate = React.useCallback(async () => {
    if (!inputs.feature_title.trim() || !inputs.business_objective.trim()) {
      addToast('Please fill in Feature Title and Business Objective before generating.', 'error')
      return
    }

    setIsGenerating(true)
    setGeneratingModule(null)
    setActiveTab('epic')

    // Clear previous outputs (will be replaced progressively)
    setEpicMap([])
    setUserStories([])
    setQaScenarios([])
    setAnalyticsEvents([])
    setRisks([])
    setReviewItems([])

    let buffer = ''

    try {
      if (DEBUG) console.log('[Generate] Starting fetch to /api/generate', inputs.feature_title, inputs.business_objective)
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_title: inputs.feature_title,
          business_objective: inputs.business_objective,
          problem_statement: inputs.problem_statement,
          success_metrics: inputs.success_metrics,
          constraints: inputs.constraints,
          assumptions: inputs.assumptions,
          impacted_teams: inputs.impacted_teams,
          uploaded_files: files.map((f) => f.data),
          file_names: files.map((f) => f.name),
        }),
      })
      if (DEBUG) console.log('[Generate] Response status:', response.status, 'OK:', response.ok)

      if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText)
        addToast(`Generation failed (${response.status}): ${errText}`, 'error')
        setIsGenerating(false)
        setGeneratingModule(null)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        addToast('No response stream from server.', 'error')
        setIsGenerating(false)
        setGeneratingModule(null)
        return
      }

      const decoder = new TextDecoder()
      let currentEvent = 'message'

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Split on blank lines (\n\n) to get complete SSE events
        let eventEnd: number
        while ((eventEnd = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, eventEnd)
          buffer = buffer.slice(eventEnd + 2)

          // Within a complete event, find the event: and data: lines
          // Each line in the event is separated by a single \n
          const eventLineIdx = rawEvent.indexOf('\nevent:')
          const dataLineIdx = rawEvent.indexOf('\ndata:')
          const lastDataIdx = rawEvent.lastIndexOf('\ndata:')

          if (lastDataIdx === -1) continue

          const ev = parseSSE(rawEvent)
          if (!ev || !ev.data) continue

          if (ev.event === 'module_start') {
            if (DEBUG) console.log('[SSE→state] module_start:', ev.data)
            setGeneratingModule(ev.data as GenerationModule)
          } else if (ev.event === 'module_complete') {
            if (DEBUG) console.log('[SSE→state] module_complete:', ev.data.slice(0, 60))
            try {
              const payload = JSON.parse(ev.data)
              if (payload.epic_map) { setEpicMap(payload.epic_map); setActiveTab('epic') }
              if (payload.user_stories) setUserStories(payload.user_stories)
              if (payload.qa_scenarios) setQaScenarios(payload.qa_scenarios)
              if (payload.analytics_events) setAnalyticsEvents(payload.analytics_events)
              if (payload.risks) setRisks(payload.risks)
              if (payload.reviewer_items) setReviewItems(payload.reviewer_items)
            } catch (e) {
              if (DEBUG) console.warn('[SSE→state] JSON parse error:', e)
            }
          } else if (ev.event === 'error') {
            if (DEBUG) console.warn('[SSE→state] error event:', ev.data)
            addToast(`Generation error: ${ev.data}`, 'error')
          } else if (ev.event === 'complete') {
            if (DEBUG) console.log('[SSE→state] complete')
            addToast('All artifacts generated successfully!', 'success')
          } else if (ev.event === 'message' && ev.data.startsWith('{')) {
            // Fallback: events without explicit event: line, try to parse as JSON
            if (DEBUG) console.log('[SSE→state] message (no event type):', ev.data.slice(0, 60))
            try {
              const payload = JSON.parse(ev.data)
              if (payload.epic_map) { setEpicMap(payload.epic_map); setActiveTab('epic') }
              if (payload.user_stories) setUserStories(payload.user_stories)
              if (payload.qa_scenarios) setQaScenarios(payload.qa_scenarios)
              if (payload.analytics_events) setAnalyticsEvents(payload.analytics_events)
              if (payload.risks) setRisks(payload.risks)
              if (payload.reviewer_items) setReviewItems(payload.reviewer_items)
            } catch (e) { /* ignore */ }
          }
        }
      }
    } catch (err) {
      console.error('Stream error:', err)
      addToast('Could not connect to backend. Make sure the server is running.', 'error')
    } finally {
      setIsGenerating(false)
      setGeneratingModule(null)
    }
  }, [inputs, files])

  // ── Per-section regenerate ─────────────────────────────────────
  const handleRegenerate = React.useCallback((module: string) => {
    // For MVP, just re-run full generation (backend handles per-module)
    setIsRegenerating((prev) => ({ ...prev, [module]: true }))
    setTimeout(() => {
      handleGenerate().finally(() => {
        setIsRegenerating((prev) => ({ ...prev, [module]: false }))
      })
    }, 100)
  }, [handleGenerate])

  const handleLoadSession = (id: string) => {
    // Future: load session from storage
    console.log('Load session', id)
  }

  const handleClearSessions = () => {}

  // ── Epic edit ──────────────────────────────────────────────────
  const handleEditEpic = (id: string, field: keyof Epic, value: string) => {
    setEpicMap((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)))
  }

  // ── User story edit ────────────────────────────────────────────
  const handleEditStory = (storyId: string, field: string, value: string) => {
    if (field.startsWith('criterion_')) {
      const criterionId = field.replace('criterion_', '')
      setUserStories((prev) =>
        prev.map((s) =>
          s.id === storyId
            ? { ...s, criteria: s.criteria.map((c) => (c.id === criterionId ? { ...c, text: value } : c)) }
            : s
        )
      )
    } else {
      setUserStories((prev) => prev.map((s) => (s.id === storyId ? { ...s, [field]: value } : s)))
    }
  }

  const handleAddCriterion = (storyId: string) => {
    setUserStories((prev) =>
      prev.map((s) =>
        s.id === storyId
          ? { ...s, criteria: [...s.criteria, { id: `c${Date.now()}`, text: 'New acceptance criterion', type: 'happy' }] }
          : s
      )
    )
  }

  const handleRemoveCriterion = (storyId: string, criterionId: string) => {
    setUserStories((prev) =>
      prev.map((s) => (s.id === storyId ? { ...s, criteria: s.criteria.filter((c) => c.id !== criterionId) } : s))
    )
  }

  // ── QA edit ────────────────────────────────────────────────────
  const handleEditQA = (id: string, field: keyof QAScenario, value: string) => {
    setQaScenarios((prev) => prev.map((q) => (q.id === id ? { ...q, [field]: value } : q)))
  }

  const handleAddScenario = (type: QAScenario['type']) => {
    setQaScenarios((prev) => [
      ...prev,
      { id: `q${Date.now()}`, title: 'New scenario', type, preconditions: 'TBD', steps: 'TBD', expectedResult: 'TBD' },
    ])
  }

  const handleRemoveScenario = (id: string) => {
    setQaScenarios((prev) => prev.filter((q) => q.id !== id))
  }

  // ── Analytics edit ────────────────────────────────────────────
  const handleEditAnalytics = (id: string, field: keyof AnalyticsEvent, value: string) => {
    setAnalyticsEvents((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
  }

  const handleAddAnalytics = () => {
    setAnalyticsEvents((prev) => [
      ...prev,
      { id: `a${Date.now()}`, eventName: 'new_event', trigger: 'TBD', purpose: 'TBD', funnelStage: 'awareness' },
    ])
  }

  const handleRemoveAnalytics = (id: string) => {
    setAnalyticsEvents((prev) => prev.filter((a) => a.id !== id))
  }

  // ── Risks edit ─────────────────────────────────────────────────
  const handleEditRisk = (id: string, field: keyof RiskItem, value: string | boolean) => {
    setRisks((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  const handleAddRisk = () => {
    setRisks((prev) => [
      ...prev,
      { id: `r${Date.now()}`, text: 'New risk item', type: 'technical', severity: 'medium', checked: false, suggestedAction: '' },
    ])
  }

  const handleRemoveRisk = (id: string) => {
    setRisks((prev) => prev.filter((r) => r.id !== id))
  }

  // ── Reviewer dismiss ───────────────────────────────────────────
  const handleDismissReview = (id: string) => {
    setReviewItems((prev) => prev.map((r) => (r.id === id ? { ...r, dismissed: true } : r)))
  }

  // ── Settings handlers ───────────────────────────────────────────
  const handleSaveSettings = async () => {
    try {
      const res = await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: llmConfig.provider,
          api_key: llmConfig.apiKey,
          base_url: llmConfig.baseUrl,
          model: llmConfig.model,
        }),
      })
      if (res.ok) {
        addToast(`${llmConfig.provider === 'minimax' ? 'MiniMax' : 'OpenAI'} settings saved successfully`, 'success')
        setSettingsOpen(false)
      } else {
        const err = await res.json().catch(() => ({}))
        addToast(`Failed to save settings: ${err.detail || res.statusText}`, 'error')
      }
    } catch (e) {
      addToast('Could not reach the backend. Is it running?', 'error')
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header
        onOpenSettings={() => setSettingsOpen(true)}
        onExportAll={() => {}}
      />
      <div className="flex-1 flex min-h-0">
        <LeftPanel
          inputs={inputs}
          files={files}
          onInputsChange={handleInputsChange}
          onFilesChange={setFiles}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          generatingModule={generatingModule}
          sessions={sessions}
          onLoadSession={handleLoadSession}
          onClearSessions={handleClearSessions}
        />
        <CenterPanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          epicMap={epicMap}
          userStories={userStories}
          qaScenarios={qaScenarios}
          analyticsEvents={analyticsEvents}
          risks={risks}
          reviewItems={reviewItems}
          onEditEpic={handleEditEpic}
          onEditStory={handleEditStory}
          onAddCriterion={handleAddCriterion}
          onRemoveCriterion={handleRemoveCriterion}
          onEditQA={handleEditQA}
          onAddScenario={handleAddScenario}
          onRemoveScenario={handleRemoveScenario}
          onEditAnalytics={handleEditAnalytics}
          onAddAnalytics={handleAddAnalytics}
          onRemoveAnalytics={handleRemoveAnalytics}
          onEditRisk={handleEditRisk}
          onAddRisk={handleAddRisk}
          onRemoveRisk={handleRemoveRisk}
          onRegenerate={handleRegenerate}
          isRegenerating={isRegenerating}
        />
        <AIReviewer
          items={reviewItems}
          onDismiss={handleDismissReview}
        />
      </div>
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={llmConfig}
        onChange={setLlmConfig}
        onSave={handleSaveSettings}
      />

      {/* Toast notifications */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm ${
              t.type === 'error'
                ? 'bg-red-500/90 text-white'
                : t.type === 'success'
                ? 'bg-green-500/90 text-white'
                : 'bg-surface text-text-primary border border-border shadow-xl'
            }`}
          >
            {t.type === 'error' && <span className="text-red-200">⚠️</span>}
            {t.type === 'success' && <span>✅</span>}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="opacity-60 hover:opacity-100 ml-1">✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}