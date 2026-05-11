'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { workbenchesApi, artifactsApi } from '@/lib/api'
import { GeneratorProvider, useGenerator } from '@/context/GeneratorContext'
import { DiscoveryForm, type DiscoveryInputs } from '@/components/inputs/DiscoveryForm'
import { EpicMap, type Epic } from '@/components/outputs/EpicMap'
import { UserStories, type UserStory } from '@/components/outputs/UserStories'
import { QAScenarios } from '@/components/outputs/QAScenarios'
import { Risks } from '@/components/outputs/Risks'
import { AnalyticsEvents } from '@/components/outputs/AnalyticsEvents'

const MODULES = ['Epic Map', 'User Stories', 'QA Scenarios', 'Analytics', 'Risks', 'Review'] as const
type ModuleName = typeof MODULES[number]

/** Top-level page — fetches workbench, loads artifacts, provides GeneratorProvider */
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
  const artifacts: any[] = artifactsData?.artifacts || []

  if (!workbench) {
    return (
      <div style={centerStyle}>
        <div style={spinnerStyle} />
        <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Loading workbench…</span>
      </div>
    )
  }

  return (
    <GeneratorProvider workbenchId={workbenchId} initialArtifacts={artifacts}>
      <WorkbenchShell workbench={workbench} />
    </GeneratorProvider>
  )
}

/** Inner shell — accesses GeneratorContext, renders form + outputs + tabs */
function WorkbenchShell({ workbench }: { workbench: any }) {
  const router = useRouter()
  const { saveArtifact, state, setGenerating } = useGenerator()
  const [activeTab, setActiveTab] = useState<ModuleName>('Epic Map')
  const [isGenerating, setIsGenerating] = useState(false)
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null)

  // Inputs state
  const [inputs, setInputs] = useState<DiscoveryInputs>({
    feature_title: (workbench.title as string) || '',
    business_objective: (workbench.business_objective as string) || '',
    problem_statement: '',
    success_metrics: '',
    constraints: '',
    assumptions: '',
    impacted_teams: [],
  })

  // Trigger autosave on any state change
  const triggerAutosave = useCallback(async (data: Record<string, unknown>) => {
    setAutosaveStatus('saving')
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(async () => {
      try {
        await workbenchesApi.autosave(workbench.id, data)
        setAutosaveStatus('saved')
        setTimeout(() => setAutosaveStatus('idle'), 2000)
      } catch {
        setAutosaveStatus('idle')
      }
    }, 2500)
  }, [workbench.id])

  // Update last_opened_at
  useEffect(() => {
    workbenchesApi.update(workbench.id, { last_opened_at: new Date().toISOString() }).catch(() => {})
  }, [workbench.id])

  // Update autosave when generator state changes
  useEffect(() => {
    triggerAutosave({ generator_state: state })
  }, [state, triggerAutosave])

  const handleGenerate = async () => {
    setIsGenerating(true)
    setGenerating('Epic Map')

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs, modules: ['epic_map', 'user_stories'] }),
      })

      if (!response.ok || !response.body) throw new Error('Generation failed')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      // Parse SSE: data: {"event":"epic_map","data":{...}}
      const epicBuffer: Epic[] = []
      const storyBuffer: UserStory[] = []
      let currentEvent: string | null = null
      let jsonBody = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim()
            jsonBody = ''
          } else if (line.startsWith('data:')) {
            jsonBody = line.slice(5).trim()
          } else if (line === '') {
            // Empty line = end of event
            if (currentEvent && jsonBody) {
              try {
                const parsed = JSON.parse(jsonBody)
                if (currentEvent === 'epic_map') {
                  if (Array.isArray(parsed)) {
                    epicBuffer.push(...parsed)
                  } else if (parsed.title) {
                    epicBuffer.push(parsed as Epic)
                  }
                } else if (currentEvent === 'user_stories') {
                  if (Array.isArray(parsed)) {
                    storyBuffer.push(...parsed)
                  } else if (parsed.title) {
                    storyBuffer.push(parsed as UserStory)
                  }
                }
              } catch {}
              currentEvent = null
              jsonBody = ''
            }
          }
        }
      }

      // Flush buffer
      if (currentEvent && jsonBody) {
        try {
          const parsed = JSON.parse(jsonBody)
          if (currentEvent === 'epic_map' && parsed.title) epicBuffer.push(parsed as Epic)
          if (currentEvent === 'user_stories' && parsed.title) storyBuffer.push(parsed as UserStory)
        } catch {}
      }

      // Persist artifacts
      if (epicBuffer.length > 0) {
        await saveArtifact(workbench.id, 'epic_map', epicBuffer)
      }
      if (storyBuffer.length > 0) {
        await saveArtifact(workbench.id, 'user_stories', storyBuffer)
      }

      setActiveTab('Epic Map')
    } catch (err) {
      console.error('Generation error:', err)
    } finally {
      setIsGenerating(false)
      setGenerating(null)
    }
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
          {autosaveStatus === 'saving' && <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Saving…</span>}
          {autosaveStatus === 'saved' && <span style={{ fontSize: '12px', color: '#22c55e' }}>Saved</span>}
        </div>
      </div>

      {/* Main content — form + output side by side */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Discovery form */}
        <div style={{ width: '380px', flexShrink: 0, borderRight: '1px solid var(--color-border)', overflowY: 'auto', padding: '20px', background: 'var(--color-surface)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '16px' }}>Discovery</h2>
          <DiscoveryForm
            inputs={inputs}
            onChange={(field, value) => {
              setInputs((prev) => ({ ...prev, [field]: value }))
              triggerAutosave({ inputs: { ...inputs, [field]: value } })
            }}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            canGenerate={!!inputs.feature_title.trim() && !!inputs.business_objective.trim()}
            generatingModule={null}
          />
        </div>

        {/* Right: Output panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Module tabs */}
          <div style={{ display: 'flex', gap: 4, padding: '10px 16px 0', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
            {MODULES.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{ ...tabBtnStyle, ...(activeTab === tab ? tabBtnActiveStyle : {}) }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Module content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {activeTab === 'Epic Map' && (
              <EpicMap
                data={(state.epic_map as unknown as Epic[]) || []}
                onEdit={() => {}}
                onRegenerate={() => {}}
                isRegenerating={false}
              />
            )}
            {activeTab === 'User Stories' && (
              <UserStories
                data={(state.user_stories as unknown as UserStory[]) || []}
                onEdit={() => {}}
                onAddCriterion={() => {}}
                onRemoveCriterion={() => {}}
                onRegenerate={() => {}}
                isRegenerating={false}
              />
            )}
            {activeTab === 'QA Scenarios' && (
              <QAScenarios
                data={[]}
                onEdit={() => {}}
                onAddScenario={() => {}}
                onRemoveScenario={() => {}}
                onRegenerate={() => {}}
                isRegenerating={false}
              />
            )}
            {activeTab === 'Risks' && (
              <Risks
                data={[]}
                onEdit={() => {}}
                onAddRisk={() => {}}
                onRemoveRisk={() => {}}
                onRegenerate={() => {}}
                isRegenerating={false}
              />
            )}
            {activeTab === 'Analytics' && (
              <AnalyticsEvents
                data={[]}
                onEdit={() => {}}
                onAddEvent={() => {}}
                onRemoveEvent={() => {}}
                onRegenerate={() => {}}
                isRegenerating={false}
              />
            )}
            {(activeTab === 'Analytics' || activeTab === 'Review') && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                Generate Epic Map &amp; User Stories first to unlock {activeTab}.
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const centerStyle: React.CSSProperties = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'var(--color-bg)' }
const spinnerStyle: React.CSSProperties = { width: 20, height: 20, border: '2px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }
const topBarStyle: React.CSSProperties = { height: 52, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }
const backBtnStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: '18px', padding: '4px 8px' }
const tabBtnStyle: React.CSSProperties = { padding: '7px 12px', borderRadius: '6px 6px 0 0', border: 'none', background: 'transparent', color: 'var(--color-text-secondary)', fontSize: '13px', cursor: 'pointer' }
const tabBtnActiveStyle: React.CSSProperties = { background: 'var(--color-bg)', color: 'var(--color-text-primary)', fontWeight: 500, borderBottom: '2px solid var(--color-primary)' }