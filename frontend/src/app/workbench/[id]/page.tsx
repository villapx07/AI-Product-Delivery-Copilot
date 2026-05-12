'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { workbenchesApi, artifactsApi } from '@/lib/api'
import { DiscoveryForm, type DiscoveryInputs } from '@/components/inputs/DiscoveryForm'
import { FileUpload } from '@/components/inputs/FileUpload'
import { EpicMap } from '@/components/outputs/EpicMap'
import { UserStories } from '@/components/outputs/UserStories'
import { QAScenarios } from '@/components/outputs/QAScenarios'
import { Risks } from '@/components/outputs/Risks'
import { AnalyticsEvents } from '@/components/outputs/AnalyticsEvents'
import { useWorkbench } from '@/hooks/useWorkbench'
import type { ModuleName } from '@/hooks/useGeneration'

interface UploadedFile { id: string; name: string; size: number; preview?: string; data: string }

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

  if (!workbenchData) {
    return (
      <div style={centerStyle}>
        <div style={spinnerStyle} />
        <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Loading workbench…</span>
      </div>
    )
  }

  return (
    <WorkbenchShell
      workbench={workbenchData}
      workbenchId={workbenchId}
      initialArtifacts={artifactsData?.artifacts || []}
    />
  )
}

// ── Inner shell ──────────────────────────────────────────────────────────────

function WorkbenchShell({ workbench, workbenchId, initialArtifacts }: {
  workbench: any; workbenchId: string; initialArtifacts: any[]
}) {
  const router = useRouter()

  const wb = useWorkbench({ workbenchId, workbench, initialArtifacts })

  const [inputs, setInputs] = useState<DiscoveryInputs>({
    feature_title: workbench.title || '',
    business_objective: workbench.business_objective || '',
    problem_statement: workbench.problem_statement || '',
    success_metrics: workbench.success_metrics || '',
    constraints: workbench.constraints || '',
    assumptions: workbench.assumptions || '',
    impacted_teams: workbench.impacted_teams || [],
  })

  const [files, setFiles] = useState<UploadedFile[]>([])

  // Update last_opened_at
  useEffect(() => {
    workbenchesApi.update(workbenchId, { last_opened_at: new Date().toISOString() }).catch(() => {})
  }, [workbenchId])

  const tabStatusColor = (tab: ModuleName): string => {
    const s = wb.moduleStates[tab]
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
          <button onClick={() => router.push('/dashboard')} style={backBtnStyle}>←</button>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{workbench.title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {wb.autosaveStatus === 'saving' && <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Saving…</span>}
          {wb.autosaveStatus === 'saved' && <span style={{ fontSize: '12px', color: '#22c55e' }}>Saved</span>}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left panel */}
        <div style={leftPanelStyle}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '16px' }}>
            Discovery
          </h2>
          <DiscoveryForm
            inputs={inputs}
            onChange={(field, value) => {
              const newInputs = { ...inputs, [field]: value }
              setInputs(newInputs)
              wb.triggerAutosave(newInputs as Record<string, unknown>)
            }}
            onGenerate={() => wb.generateModule('Epic Map')}
            isGenerating={wb.moduleStates['Epic Map'].status === 'generating'}
            canGenerate={!!inputs.feature_title.trim() && !!inputs.business_objective.trim()}
            generatingModule={null}
          />
          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '24px', paddingTop: '20px' }}>
            <FileUpload files={files} onFilesChange={setFiles} />
          </div>
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Module tabs */}
          <div style={tabBarStyle}>
            {(['Epic Map', 'User Stories', 'QA Scenarios', 'Analytics', 'Risks', 'Review'] as ModuleName[]).map((tab) => (
              <button
                key={tab}
                onClick={() => wb.setActiveTab(tab)}
                style={{ ...tabBtnStyle, ...(wb.activeTab === tab ? tabBtnActiveStyle : {}) }}
              >
                {tab}
                <span style={{
                  display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                  background: tabStatusColor(tab), marginLeft: 4, verticalAlign: 'middle'
                }} />
              </button>
            ))}
          </div>

          {/* Module content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            <ModuleContent
              tab={wb.activeTab}
              moduleStates={wb.moduleStates}
              onGenerate={wb.generateModule}
              onRegenerate={wb.regenerateModule}
              elapsedSeconds={wb.elapsedSeconds}
              // Epic
              onAddEpic={wb.addEpic}
              onDeleteEpic={wb.deleteEpic}
              // Story
              onAddStory={wb.addStory}
              onDeleteStory={wb.deleteStory}
              // QA
              onAddScenario={wb.addScenario}
              onDeleteScenario={wb.deleteScenario}
              onEditScenario={wb.editScenario}
              // Analytics
              onAddEvent={wb.addEvent}
              onDeleteEvent={wb.deleteEvent}
              onEditEvent={wb.editEvent}
              // Risks
              onAddRisk={wb.addRisk}
              onDeleteRisk={wb.deleteRisk}
              onEditRisk={wb.editRisk}
            />
          </div>
        </div>
      </div>

      {/* Generating overlay modal — shown for ALL modules */}
      {wb.generatingModal && (
        <GeneratingModal module={wb.generatingModal} elapsedSeconds={wb.elapsedSeconds} />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Module content renderer — consistent for all tabs ─────────────────────────

function ModuleContent({
  tab, moduleStates, onGenerate, onRegenerate, elapsedSeconds,
  onAddEpic, onDeleteEpic,
  onAddStory, onDeleteStory,
  onAddScenario, onDeleteScenario, onEditScenario,
  onAddEvent, onDeleteEvent, onEditEvent,
  onAddRisk, onDeleteRisk, onEditRisk,
}: {
  tab: ModuleName
  moduleStates: Record<ModuleName, any>
  onGenerate: (tab: ModuleName) => void
  onRegenerate: (tab: ModuleName) => void
  elapsedSeconds: number
  // Epic
  onAddEpic: (epic: any) => void
  onDeleteEpic: (id: string) => void
  // Story
  onAddStory: (epicId: string) => void
  onDeleteStory: (storyId: string) => void
  // QA
  onAddScenario: (type: any) => void
  onDeleteScenario: (id: string) => void
  onEditScenario: (id: string, field: string, value: string) => void
  // Analytics
  onAddEvent: () => void
  onDeleteEvent: (id: string) => void
  onEditEvent: (id: string, field: string, value: string) => void
  // Risks
  onAddRisk: () => void
  onDeleteRisk: (id: string) => void
  onEditRisk: (id: string, field: string, value: string | boolean) => void
}) {
  const s = moduleStates[tab]

  // ── Missing prerequisite ────────────────────────────────────────────────
  if (s.status === 'missing_prereq') {
    return (
      <div style={prereqStyle}>
        <span style={{ fontSize: '20px' }}>⚠️</span>
        <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'var(--color-text-secondary)' }}>{s.error}</p>
      </div>
    )
  }

  // ── Generating — consistent inline indicator (blur modal handled by page.tsx) ──
  if (s.status === 'generating') {
    const mins = Math.floor(elapsedSeconds / 60)
    const secs = elapsedSeconds % 60
    return (
      <div style={{ ...generatingStyle, flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={spinnerStyle} />
          <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Generating {tab}…</span>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', opacity: 0.7 }}>
          Elapsed: {mins > 0 ? `${mins}m ${secs}s` : `${secs}s`}
        </span>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (s.status === 'error') {
    const isTimeout = s.error?.includes('timed out') || s.error?.includes('timeout') ||
      s.error?.includes('504') || s.error?.includes('net::ERR')
    return (
      <div style={errorStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <span style={{ fontSize: '13px', color: '#ef4444', fontWeight: 500 }}>Generation Failed</span>
          </div>
          {isTimeout && (
            <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#f59e0b' }}>
              ⏱ Request timed out. The AI may still be processing — please try regenerating.
            </p>
          )}
          <p style={{ margin: isTimeout ? '0 0 12px' : '0 0 12px', fontSize: '13px', color: '#ef4444' }}>{s.error}</p>
          <button onClick={() => onRegenerate(tab)} style={regenBtnStyle}>Try again</button>
        </div>
      </div>
    )
  }

  // ── Idle — never generated ──────────────────────────────────────────────
  if (s.status === 'idle' && !s.data) {
    return (
      <div style={idleStyle}>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>No {tab.toLowerCase()} generated yet.</p>
        <button onClick={() => onGenerate(tab)} style={generateBtnStyle}>Generate {tab}</button>
      </div>
    )
  }

  // ── Saved / has data — render the component ───────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header bar — consistent across all tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '12px', color: '#22c55e' }}>✓ Saved</span>
          {s.updatedAt && (
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Updated {new Date(s.updatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        <button onClick={() => onRegenerate(tab)} style={regenBtnStyle}>Regenerate</button>
      </div>

      {/* Tab-specific output */}
      {tab === 'Epic Map' && (
        <EpicMap
          data={s.data || []}
          onEdit={() => {}}
          onAddEpic={onAddEpic}
          onDeleteEpic={onDeleteEpic}
          onRegenerate={() => onRegenerate(tab)}
          isRegenerating={false}
        />
      )}
      {tab === 'User Stories' && (
        <UserStories
          data={s.data || []}
          onEdit={() => {}}
          onAddStory={onAddStory}
          onDeleteStory={onDeleteStory}
          onAddCriterion={() => {}}
          onRemoveCriterion={() => {}}
          onRegenerate={() => onRegenerate(tab)}
          isRegenerating={false}
        />
      )}
      {tab === 'QA Scenarios' && (
        <QAScenarios
          data={s.data || []}
          onEdit={onEditScenario}
          onAddScenario={onAddScenario}
          onRemoveScenario={onDeleteScenario}
          onRegenerate={() => onRegenerate(tab)}
          isRegenerating={false}
        />
      )}
      {tab === 'Analytics' && (
        <AnalyticsEvents
          data={s.data || []}
          onEdit={onEditEvent}
          onAddEvent={onAddEvent}
          onRemoveEvent={onDeleteEvent}
          onRegenerate={() => onRegenerate(tab)}
          isRegenerating={false}
        />
      )}
      {tab === 'Risks' && (
        <Risks
          data={s.data || []}
          onEdit={onEditRisk}
          onAddRisk={onAddRisk}
          onRemoveRisk={onDeleteRisk}
          onRegenerate={() => onRegenerate(tab)}
          isRegenerating={false}
        />
      )}
      {tab === 'Review' && (
        <AIReviewOutput
          data={s.data || []}
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
        <div key={i} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#3b82f6', color: '#fff', textTransform: 'uppercase' }}>
              {item.severity || item.type || 'Note'}
            </span>
          </div>
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 6px' }}>
            {item.title || item.observation || item.issue || JSON.stringify(item)}
          </p>
          {item.description && <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>{item.description}</p>}
          {item.recommendation && <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '6px 0 0', fontStyle: 'italic' }}>Recommendation: {item.recommendation}</p>}
        </div>
      ))}
    </div>
  )
}

// ── Generating modal — blur overlay for ALL modules ───────────────────────────

function GeneratingModal({ module, elapsedSeconds }: { module: ModuleName; elapsedSeconds: number }) {
  const mins = Math.floor(elapsedSeconds / 60)
  const secs = elapsedSeconds % 60
  return (
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
        <div style={{ position: 'relative', width: 64, height: 64 }}>
          <svg style={{ width: 64, height: 64, transform: 'rotate(-90deg)' }} viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="var(--color-border)" strokeWidth="4" />
            <circle
              cx="32" cy="32" r="26" fill="none" stroke="#3b82f6" strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 26}`}
              strokeDashoffset={`${2 * Math.PI * 26 * (1 - Math.min(elapsedSeconds % 60, 59) / 60)}`}
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
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>Generating {module}…</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
            {mins > 0 ? `${mins}m ${secs}s` : `${secs}s`} elapsed
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────

const centerStyle: React.CSSProperties = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'var(--color-bg)' }
const spinnerStyle: React.CSSProperties = { width: 20, height: 20, border: '2px solid var(--color-border)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }
const topBarStyle: React.CSSProperties = { height: 52, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }
const backBtnStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: '18px', padding: '4px 8px' }
const leftPanelStyle: React.CSSProperties = { width: '380px', flexShrink: 0, borderRight: '1px solid var(--color-border)', overflowY: 'auto', padding: '20px', background: 'var(--color-surface)' }
const tabBarStyle: React.CSSProperties = { display: 'flex', gap: 4, padding: '10px 16px 0', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }
const tabBtnStyle: React.CSSProperties = { padding: '7px 12px', borderRadius: '6px 6px 0 0', border: 'none', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: '13px', cursor: 'pointer' }
const tabBtnActiveStyle: React.CSSProperties = { background: 'var(--color-bg)', color: 'var(--color-text-primary)', fontWeight: 500 }
const generatingStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '40px 20px', color: 'var(--color-text-secondary)' }
const idleStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 12, textAlign: 'center' as const }
const prereqStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 8, textAlign: 'center' as const }
const errorStyle: React.CSSProperties = { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '16px 20px' }
const generateBtnStyle: React.CSSProperties = { padding: '9px 18px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }
const regenBtnStyle: React.CSSProperties = { padding: '6px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }