'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { workbenchesApi, artifactsApi, generateModuleStream, parseModuleSSEFromText } from '@/lib/api'
import { GeneratorProvider, useGenerator } from '@/context/GeneratorContext'
import { DiscoveryForm, type DiscoveryInputs } from '@/components/inputs/DiscoveryForm'
import { EpicMap, type Epic } from '@/components/outputs/EpicMap'
import { UserStories, type UserStory } from '@/components/outputs/UserStories'
import { QAScenarios } from '@/components/outputs/QAScenarios'
import { Risks } from '@/components/outputs/Risks'
import { AnalyticsEvents } from '@/components/outputs/AnalyticsEvents'

// ── Module config ──────────────────────────────────────────────────────────────

const MODULES = ['Epic Map', 'User Stories', 'QA Scenarios', 'Analytics', 'Risks', 'Review'] as const
type ModuleName = typeof MODULES[number]

const MODULE_KEYS: Record<ModuleName, string> = {
  'Epic Map': 'epic_map',
  'User Stories': 'user_stories',
  'QA Scenarios': 'qa_scenarios',
  'Analytics': 'analytics',
  'Risks': 'risks',
  'Review': 'reviewer',
}

// Module prerequisites
const PREREQUISITES: Record<ModuleName, ModuleName[]> = {
  'Epic Map': [],
  'User Stories': ['Epic Map'],
  'QA Scenarios': ['User Stories'],
  'Analytics': ['User Stories'],
  'Risks': ['Epic Map', 'User Stories'],
  'Review': ['Epic Map', 'User Stories', 'QA Scenarios', 'Analytics', 'Risks'],
}

type ModuleStatus = 'idle' | 'generating' | 'saved' | 'error' | 'missing_prereq'

interface ModuleState {
  status: ModuleStatus
  data: unknown
  updatedAt: string | null
  error: string | null
}

// ── Page shell ────────────────────────────────────────────────────────────────

export default function WorkbenchPage() {
  const params = useParams()
  const router = useRouter()
  const workbenchId = params.id as string
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login')
  }, [isAuthenticated, router])

  const { data: workbenchData } = useQuery<any>({
    queryKey: ['workbench', workbenchId],
    queryFn: () => workbenchesApi.get(workbenchId),
    enabled: !!workbenchId,
  })

  const { data: artifactsData } = useQuery<any>({
    queryKey: ['artifacts', workbenchId],
    queryFn: () => artifactsApi.list(workbenchId),
    enabled: !!workbenchId,
  })

  const workbench = workbenchData

  if (!workbench) {
    return (
      <div style={centerStyle}>
        <div style={spinnerStyle} />
        <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Loading workbench…</span>
      </div>
    )
  }

  return (
    <GeneratorProvider workbenchId={workbenchId} initialArtifacts={artifactsData?.artifacts || []}>
      <WorkbenchShell workbench={workbench} />
    </GeneratorProvider>
  )
}

// ── Inner shell ────────────────────────────────────────────────────────────────

function WorkbenchShell({ workbench }: { workbench: any }) {
  const router = useRouter()
  const { state, saveArtifact } = useGenerator()

  const [activeTab, setActiveTab] = useState<ModuleName>('Epic Map')
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [generatingModal, setGeneratingModal] = useState<ModuleName | null>(null)
  const [moduleStates, setModuleStates] = useState<Record<ModuleName, ModuleState>>({
    'Epic Map': { status: 'idle', data: null, updatedAt: null, error: null },
    'User Stories': { status: 'idle', data: null, updatedAt: null, error: null },
    'QA Scenarios': { status: 'idle', data: null, updatedAt: null, error: null },
    'Analytics': { status: 'idle', data: null, updatedAt: null, error: null },
    'Risks': { status: 'idle', data: null, updatedAt: null, error: null },
    'Review': { status: 'idle', data: null, updatedAt: null, error: null },
  })

  const autosaveTimer = useRef<NodeJS.Timeout | null>(null)

  // Track generation start time for elapsed counter
  const generationStartRef = useRef<Record<ModuleName, number | null>>({
    'Epic Map': null,
    'User Stories': null,
    'QA Scenarios': null,
    'Analytics': null,
    'Risks': null,
    'Review': null,
  })
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Inputs state
  const [inputs, setInputs] = useState<DiscoveryInputs>({
    feature_title: workbench.title || '',
    business_objective: workbench.business_objective || '',
    problem_statement: workbench.problem_statement || '',
    success_metrics: workbench.success_metrics || '',
    constraints: workbench.constraints || '',
    assumptions: workbench.assumptions || '',
    impacted_teams: workbench.impacted_teams || [],
  })

  // Restore artifacts into moduleStates on mount
  useEffect(() => {
    if (state.epic_map) {
      setModuleStates((s) => ({ ...s, 'Epic Map': { status: 'saved', data: state.epic_map, updatedAt: new Date().toISOString(), error: null } }))
    }
    if (state.user_stories) {
      setModuleStates((s) => ({
        ...s,
        'User Stories': { status: 'saved', data: state.user_stories, updatedAt: new Date().toISOString(), error: null },
        // Clear missing_prereq if user_stories were just restored
        ...(s['QA Scenarios'].status === 'missing_prereq' && s['QA Scenarios'].error?.includes('User Stories')
          ? { 'QA Scenarios': { ...s['QA Scenarios'], status: 'idle' } }
          : {}),
        ...(s['Analytics'].status === 'missing_prereq' && s['Analytics'].error?.includes('User Stories')
          ? { 'Analytics': { ...s['Analytics'], status: 'idle' } }
          : {}),
      }))
    }
    if (state.qa_scenarios) {
      setModuleStates((s) => ({ ...s, 'QA Scenarios': { status: 'saved', data: state.qa_scenarios, updatedAt: new Date().toISOString(), error: null } }))
    }
    if (state.analytics) {
      setModuleStates((s) => ({ ...s, 'Analytics': { status: 'saved', data: state.analytics, updatedAt: new Date().toISOString(), error: null } }))
    }
    if (state.risks) {
      setModuleStates((s) => ({ ...s, 'Risks': { status: 'saved', data: state.risks, updatedAt: new Date().toISOString(), error: null } }))
    }
  }, [state])

  // Cleanup elapsed timer on unmount
  useEffect(() => {
    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current)
    }
  }, [])

  // Trigger autosave on discovery inputs change
  const triggerAutosave = useCallback(
    (newInputs: DiscoveryInputs) => {
      setAutosaveStatus('saving')
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
      autosaveTimer.current = setTimeout(async () => {
        try {
          await workbenchesApi.autosave(workbench.id, { inputs: newInputs })
          setAutosaveStatus('saved')
          setTimeout(() => setAutosaveStatus('idle'), 2000)
        } catch {
          setAutosaveStatus('idle')
        }
      }, 2500)
    },
    [workbench.id],
  )

  // Update last_opened_at
  useEffect(() => {
    workbenchesApi.update(workbench.id, { last_opened_at: new Date().toISOString() }).catch(() => {})
  }, [workbench.id])

  // ── Module generation ───────────────────────────────────────────────────────

  const generateModule = useCallback(
    async (module: ModuleName) => {
      // Prerequisite check
      const prereqs = PREREQUISITES[module]
      for (const p of prereqs) {
        const pState = moduleStates[p]
        if (!pState || pState.status !== 'saved') {
          setModuleStates((s) => ({
            ...s,
            [module]: { ...s[module], status: 'missing_prereq', error: `Generate ${p} first` },
          }))
          return
        }
      }

      setModuleStates((s) => ({
        ...s,
        [module]: { status: 'generating', data: s[module].data, updatedAt: s[module].updatedAt, error: null },
      }))
      setGeneratingModal(module)
      generationStartRef.current[module] = Date.now()
      setElapsedSeconds(0)
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current)
      elapsedTimerRef.current = setInterval(() => {
        const start = generationStartRef.current[module]
        if (start) setElapsedSeconds(Math.floor((Date.now() - start) / 1000))
      }, 1000)

      try {
        // Simple request-response approach: POST once, get full response
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`,
        }
        const response = await fetch('/api/generate/modular', {
          method: 'POST',
          headers,
          body: JSON.stringify({ workbench_id: workbench.id, module: MODULE_KEYS[module], regenerate: false }),
        })

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`Generation failed: ${response.status} — ${errText}`)
        }

        // Read the full SSE response as text
        const text = await response.text()
        // Parse SSE: events are separated by blank lines (\n\n)
        // Each event block contains event: + data: on separate lines
        const moduleKey = MODULE_KEYS[module]
        let parsedData = null
        const eventBlocks = text.split('\n\n')
        for (const block of eventBlocks) {
          const lines = block.split('\n')
          let dataLine = ''
          for (const line of lines) {
            if (line.startsWith('data:')) {
              dataLine = line.slice(5).trim()
              break
            }
          }
          if (!dataLine) continue
          try {
            const parsed = JSON.parse(dataLine)
            if (parsed && typeof parsed === 'object' && moduleKey in parsed) {
              parsedData = parsed[moduleKey]
              break
            }
          } catch {}
        }

        if (!parsedData) {
          throw new Error('No valid data received from server')
        }

        // Save artifact
        await saveArtifact(workbench.id, moduleKey, parsedData)

        setModuleStates((s) => ({
          ...s,
          [module]: {
            status: 'saved',
            data: parsedData,
            updatedAt: new Date().toISOString(),
            error: null,
          },
        }))
        if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null }
        setGeneratingModal(null)
      } catch (err: any) {
        console.error('[generateModule] error:', err)
        setModuleStates((s) => ({
          ...s,
          [module]: { ...s[module], status: 'error', error: err?.message || 'Generation failed' },
        }))
        if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null }
        setGeneratingModal(null)
      }
    },
    [workbench.id, moduleStates, saveArtifact],
  )

  const regenerateModule = useCallback(
    async (module: ModuleName) => {
      setModuleStates((s) => ({
        ...s,
        [module]: { status: 'generating', data: s[module].data, updatedAt: s[module].updatedAt, error: null },
      }))
      setGeneratingModal(module)
      generationStartRef.current[module] = Date.now()
      setElapsedSeconds(0)
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current)
      elapsedTimerRef.current = setInterval(() => {
        const start = generationStartRef.current[module]
        if (start) setElapsedSeconds(Math.floor((Date.now() - start) / 1000))
      }, 1000)

      try {
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useAuthStore.getState().token}`,
        }
        const response = await fetch('/api/generate/modular', {
          method: 'POST',
          headers,
          body: JSON.stringify({ workbench_id: workbench.id, module: MODULE_KEYS[module], regenerate: true }),
        })

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`Regeneration failed: ${response.status} — ${errText}`)
        }

        // Read the full SSE response as text
        const text = await response.text()
        // Parse SSE: events are separated by blank lines (\n\n)
        // Each event block contains event: + data: on separate lines
        const moduleKey = MODULE_KEYS[module]
        let parsedData = null
        const eventBlocks = text.split('\n\n')
        for (const block of eventBlocks) {
          const lines = block.split('\n')
          let dataLine = ''
          for (const line of lines) {
            if (line.startsWith('data:')) {
              dataLine = line.slice(5).trim()
              break
            }
          }
          if (!dataLine) continue
          try {
            const parsed = JSON.parse(dataLine)
            if (parsed && typeof parsed === 'object' && moduleKey in parsed) {
              parsedData = parsed[moduleKey]
              break
            }
          } catch {}
        }

        if (!parsedData) {
          throw new Error('No valid data received from server')
        }

        await saveArtifact(workbench.id, moduleKey, parsedData)

        setModuleStates((s) => ({
          ...s,
          [module]: {
            status: 'saved',
            data: parsedData,
            updatedAt: new Date().toISOString(),
            error: null,
          },
        }))
        if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null }
        setGeneratingModal(null)
      } catch (err: any) {
        console.error('[regenerateModule] error:', err)
        setModuleStates((s) => ({
          ...s,
          [module]: { ...s[module], status: 'error', error: err?.message || 'Regeneration failed' },
        }))
        if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null }
        setGeneratingModal(null)
      }
    },
    [workbench.id, moduleStates, saveArtifact],
  )

  // ── Module tab style helper ─────────────────────────────────────────────────

  const handleAddEpic = useCallback((newEpic: Epic) => {
    setModuleStates((s) => {
      const current = (s['Epic Map'].data as Epic[]) || []
      return {
        ...s,
        'Epic Map': {
          ...s['Epic Map'],
          data: [...current, newEpic],
          status: 'saved',
        },
      }
    })
    // Also save to backend
    saveArtifact(workbench.id, 'epic_map', [
      ...((moduleStates['Epic Map'].data as Epic[]) || []),
      newEpic,
    ])
  }, [workbench.id, moduleStates, saveArtifact])

  const handleAddStory = useCallback(() => {
    const newStory: UserStory = {
      id: `story-${Date.now()}`,
      epicId: '',
      user: 'User',
      goal: 'Goal',
      benefit: 'Benefit',
      criteria: [],
    }
    setModuleStates((s) => {
      const current = (s['User Stories'].data as UserStory[]) || []
      return {
        ...s,
        'User Stories': {
          ...s['User Stories'],
          data: [...current, newStory],
          status: 'saved',
        },
      }
    })
    saveArtifact(workbench.id, 'user_stories', [
      ...((moduleStates['User Stories'].data as UserStory[]) || []),
      newStory,
    ])
  }, [workbench.id, moduleStates, saveArtifact])

  const tabStatusColor = (tab: ModuleName): string => {
    const s = moduleStates[tab]
    if (s.status === 'generating') return '#3b82f6'
    if (s.status === 'saved') return '#22c55e'
    if (s.status === 'error') return '#ef4444'
    if (s.status === 'missing_prereq') return '#f59e0b'
    return 'var(--color-text-secondary)'
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={topBarStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/dashboard')} style={backBtnStyle}>
            ←
          </button>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {workbench.title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {autosaveStatus === 'saving' && (
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Saving…</span>
          )}
          {autosaveStatus === 'saved' && (
            <span style={{ fontSize: '12px', color: '#22c55e' }}>Saved</span>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left panel: Discovery form */}
        <div style={leftPanelStyle}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '16px' }}>
            Discovery
          </h2>
          <DiscoveryForm
            inputs={inputs}
            onChange={(field, value) => {
              const newInputs = { ...inputs, [field]: value }
              setInputs(newInputs)
              triggerAutosave(newInputs)
            }}
            onGenerate={() => generateModule('Epic Map')}
            isGenerating={moduleStates['Epic Map'].status === 'generating'}
            canGenerate={!!inputs.feature_title.trim() && !!inputs.business_objective.trim()}
            generatingModule={null}
          />
        </div>

        {/* Right panel: outputs */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Module tabs */}
          <div style={tabBarStyle}>
            {MODULES.map((tab) => {
              const s = moduleStates[tab]
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    ...tabBtnStyle,
                    ...(activeTab === tab ? tabBtnActiveStyle : {}),
                    position: 'relative',
                  }}
                >
                  {tab}
                  {/* Status dot */}
                  <span
                    style={{
                      display: 'inline-block',
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: tabStatusColor(tab),
                      marginLeft: 4,
                      verticalAlign: 'middle',
                    }}
                  />
                </button>
              )
            })}
          </div>

          {/* Module content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            <ModuleContent
              tab={activeTab}
              moduleStates={moduleStates}
              onGenerate={generateModule}
              onRegenerate={regenerateModule}
              elapsedSeconds={elapsedSeconds}
              onAddEpic={handleAddEpic}
              onAddStory={handleAddStory}
            />
          </div>
        </div>
      </div>

      {/* Generating modal */}
      {generatingModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 16, padding: '32px 40px', minWidth: 300,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}>
            {/* Animated ring + progress bar */}
            <div style={{ position: 'relative', width: 64, height: 64 }}>
              <svg style={{ width: 64, height: 64, transform: 'rotate(-90deg)' }} viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" fill="none" stroke="var(--color-border)" strokeWidth="4" />
                <circle
                  cx="32" cy="32" r="26" fill="none"
                  stroke="#3b82f6" strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 26}`}
                  strokeDashoffset={`${2 * Math.PI * 26 * (1 - (elapsedSeconds % 60) / 60)}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#3b82f6',
              }}>
                {elapsedSeconds}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Generating {generatingModal}…
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                {Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s elapsed
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Module content renderer ───────────────────────────────────────────────────

function ModuleContent({
  tab,
  moduleStates,
  onGenerate,
  onRegenerate,
  elapsedSeconds,
  onAddEpic,
  onAddStory,
}: {
  tab: ModuleName
  moduleStates: Record<ModuleName, ModuleState>
  onGenerate: (tab: ModuleName) => void
  onRegenerate: (tab: ModuleName) => void
  elapsedSeconds: number
  onAddEpic?: (epic: Epic) => void
  onAddStory?: () => void
}) {
  const s = moduleStates[tab]

  // Status: missing_prereq
  if (s.status === 'missing_prereq') {
    return (
      <div style={prereqStyle}>
        <span style={{ fontSize: '20px' }}>⚠️</span>
        <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'var(--color-text-secondary)' }}>{s.error}</p>
      </div>
    )
  }

  // Status: generating
  if (s.status === 'generating') {
    const mins = Math.floor(elapsedSeconds / 60)
    const secs = elapsedSeconds % 60
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
    return (
      <div style={{ ...generatingStyle, flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={spinnerStyle} />
          <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Generating {tab}…</span>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', opacity: 0.7 }}>Elapsed: {timeStr}</span>
      </div>
    )
  }

  // Status: error
  if (s.status === 'error') {
    const isTimeout = s.error?.includes('timed out') || s.error?.includes('timeout') || s.error?.includes('504') || s.error?.includes('net::ERR')
    return (
      <div style={errorStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <span style={{ fontSize: '13px', color: '#ef4444', fontWeight: 500 }}>Generation Failed</span>
          </div>
          {isTimeout && (
            <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#f59e0b' }}>
              ⏱ The request timed out. The AI may still be processing — please try regenerating.
            </p>
          )}
          <p style={{ margin: isTimeout ? '0 0 12px' : '0 0 12px', fontSize: '13px', color: '#ef4444' }}>{s.error}</p>
          <button onClick={() => onRegenerate(tab)} style={regenBtnStyle}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  // Status: idle (no data yet)
  if (s.status === 'idle' && !s.data) {
    return (
      <div style={idleStyle}>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          No {tab.toLowerCase()} generated yet.
        </p>
        <button onClick={() => onGenerate(tab)} style={generateBtnStyle}>
          Generate {tab}
        </button>
      </div>
    )
  }

  // Render module output
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '12px', color: '#22c55e' }}>✓ Saved</span>
          {s.updatedAt && (
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Updated {new Date(s.updatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        <button onClick={() => onRegenerate(tab)} style={regenBtnStyle}>
          Regenerate
        </button>
      </div>

      {/* Module-specific output */}
      {tab === 'Epic Map' && (
        <EpicMap
          data={(s.data as Epic[]) || []}
          onEdit={() => {}}
          onAddEpic={onAddEpic}
          onRegenerate={() => onRegenerate(tab)}
          isRegenerating={false}
        />
      )}
      {tab === 'User Stories' && (
        <UserStories
          data={(s.data as UserStory[]) || []}
          onEdit={() => {}}
          onAddStory={onAddStory}
          onAddCriterion={() => {}}
          onRemoveCriterion={() => {}}
          onRegenerate={() => onRegenerate(tab)}
          isRegenerating={false}
        />
      )}
      {tab === 'QA Scenarios' && (
        <QAScenarios
          data={(s.data as any[]) || []}
          onEdit={() => {}}
          onAddScenario={() => {}}
          onRemoveScenario={() => {}}
          onRegenerate={() => onRegenerate(tab)}
          isRegenerating={false}
        />
      )}
      {tab === 'Analytics' && (
        <AnalyticsEvents
          data={(s.data as any[]) || []}
          onEdit={() => {}}
          onAddEvent={() => {}}
          onRemoveEvent={() => {}}
          onRegenerate={() => onRegenerate(tab)}
          isRegenerating={false}
        />
      )}
      {tab === 'Risks' && (
        <Risks
          data={(s.data as any[]) || []}
          onEdit={() => {}}
          onAddRisk={() => {}}
          onRemoveRisk={() => {}}
          onRegenerate={() => onRegenerate(tab)}
          isRegenerating={false}
        />
      )}
      {tab === 'Review' && (
        <AIReviewOutput
          data={(s.data as any[]) || []}
          onRegenerate={() => onRegenerate(tab)}
        />
      )}
    </div>
  )
}

// ── AI Review output ──────────────────────────────────────────────────────────

function AIReviewOutput({ data, onRegenerate }: { data: any[]; onRegenerate: () => void }) {
  if (!data || data.length === 0) {
    return (
      <div style={idleStyle}>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>No review generated yet.</p>
        <button onClick={onRegenerate} style={generateBtnStyle}>Run AI Review</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {data.map((item: any, i: number) => (
        <div
          key={i}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{
              fontSize: '11px', fontWeight: 600, padding: '2px 8px',
              borderRadius: 20, background: '#3b82f6', color: '#fff',
              textTransform: 'uppercase',
            }}>
              {item.severity || item.type || 'Note'}
            </span>
          </div>
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 6px' }}>
            {item.title || item.observation || item.issue || JSON.stringify(item)}
          </p>
          {item.description && (
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
              {item.description}
            </p>
          )}
          {item.recommendation && (
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '6px 0 0', fontStyle: 'italic' }}>
              Recommendation: {item.recommendation}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const centerStyle: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center',
  justifyContent: 'center', gap: 12, background: 'var(--color-bg)',
}
const spinnerStyle: React.CSSProperties = {
  width: 20, height: 20, border: '2px solid var(--color-border)',
  borderTopColor: '#3b82f6', borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
}
const topBarStyle: React.CSSProperties = {
  height: 52, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
}
const backBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--color-text-secondary)', fontSize: '18px', padding: '4px 8px',
}
const leftPanelStyle: React.CSSProperties = {
  width: '380px', flexShrink: 0, borderRight: '1px solid var(--color-border)',
  overflowY: 'auto', padding: '20px', background: 'var(--color-surface)',
}
const tabBarStyle: React.CSSProperties = {
  display: 'flex', gap: 4, padding: '10px 16px 0',
  borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)',
}
const tabBtnStyle: React.CSSProperties = {
  padding: '7px 12px', borderRadius: '6px 6px 0 0', border: 'none',
  background: 'transparent', color: 'var(--color-text-secondary)',
  fontSize: '13px', cursor: 'pointer',
}
const tabBtnActiveStyle: React.CSSProperties = {
  background: 'var(--color-bg)', color: 'var(--color-text-primary)', fontWeight: 500,
}
const generatingStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '40px 20px',
  color: 'var(--color-text-secondary)',
}
const idleStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', padding: '40px 20px', gap: 12,
  textAlign: 'center' as const,
}
const prereqStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', padding: '40px 20px', gap: 8, textAlign: 'center' as const,
}
const errorStyle: React.CSSProperties = {
  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
  borderRadius: '10px', padding: '16px 20px',
}
const generateBtnStyle: React.CSSProperties = {
  padding: '9px 18px', borderRadius: 8, border: 'none',
  background: '#3b82f6', color: '#fff',
  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
}
const regenBtnStyle: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 6, border: '1px solid var(--color-border)',
  background: 'transparent', color: 'var(--color-text-secondary)',
  fontSize: '12px', fontWeight: 500, cursor: 'pointer',
}