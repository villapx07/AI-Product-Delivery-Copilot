'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { workbenchesApi, artifactsApi } from '@/lib/api'

/**
 * Workbench page — loads a workbench and all its artifacts,
 * then renders the Forge generator pre-populated with saved data.
 * Autosave triggers on any state change (debounced 2-3s).
 */
export default function WorkbenchPage() {
  const params = useParams()
  const router = useRouter()
  const workbenchId = params.id as string

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) router.replace('/login')
  }, [isAuthenticated, router])

  // Load workbench
  const { data: workbenchData } = useQuery<any>({
    queryKey: ['workbench', workbenchId],
    queryFn: () => workbenchesApi.get(workbenchId),
    enabled: !!workbenchId,
  })

  // Load artifacts
  const { data: artifactsData } = useQuery<any>({
    queryKey: ['artifacts', workbenchId],
    queryFn: () => artifactsApi.list(workbenchId),
    enabled: !!workbenchId,
  })

  const workbench = workbenchData
  const artifacts: any[] = artifactsData?.artifacts || []

  // Autosave helper
  const triggerAutosave = useCallback((data: Record<string, unknown>) => {
    setAutosaveStatus('saving')
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(async () => {
      try {
        await workbenchesApi.autosave(workbenchId, data)
        setAutosaveStatus('saved')
        setTimeout(() => setAutosaveStatus('idle'), 2000)
      } catch {
        setAutosaveStatus('idle')
      }
    }, 2500)
  }, [workbenchId])

  // Update last_opened_at on mount
  useEffect(() => {
    if (workbenchId) {
      workbenchesApi.update(workbenchId, { last_opened_at: new Date().toISOString() }).catch(() => {})
    }
  }, [workbenchId])

  // Loading state
  if (!workbench) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'var(--color-bg)' }}>
        <div style={{ width: 20, height: 20, border: '2px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Loading workbench…</span>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
      {/* Workbench top bar */}
      <div style={{
        height: 52, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: '18px', padding: '4px 8px' }}>
            ←
          </button>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{workbench.title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {autosaveStatus === 'saving' && <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Saving…</span>}
          {autosaveStatus === 'saved' && <span style={{ fontSize: '12px', color: '#22c55e' }}>Saved</span>}
          {autosaveStatus === 'idle' && workbench.updated_at && (
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Saved {new Date(workbench.updated_at).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Generator content — inject artifacts here */}
      <WorkbenchGenerator
        workbench={workbench}
        artifacts={artifactsData?.artifacts || []}
        onStateChange={triggerAutosave}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/**
 * WorkbenchGenerator — wraps the existing generator UI.
 * Receives pre-loaded workbench + artifact data.
 * For MVP: renders the core generator, connected to workbench autosave.
 *
 * TODO (next iteration): wire up all modules to persist to workbench artifacts.
 */
function WorkbenchGenerator({
  workbench,
  artifacts,
  onStateChange,
}: {
  workbench: Record<string, unknown>
  artifacts: Record<string, unknown>[]
  onStateChange: (data: Record<string, unknown>) => void
}) {
  // Restore artifact data into generator state
  const epicArtifact = artifacts.find((a: any) => a.artifact_type === 'epic_map')
  const storiesArtifact = artifacts.find((a: any) => a.artifact_type === 'user_stories')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' as const, background: 'var(--color-bg)' }}>
      {/* Workbench header info */}
      {workbench.business_objective != null && workbench.business_objective !== '' && (
        <div style={{
          background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)',
          padding: '12px 20px',
        }}>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
            <strong style={{ color: 'var(--color-text-primary)' }}>Objective:</strong> {String(workbench.business_objective)}
          </p>
        </div>
      )}

      {/* Module tabs */}
      <div style={{
        display: 'flex', gap: 4, padding: '12px 20px 0',
        borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)',
      }}>
        {['Epic Map', 'User Stories', 'QA Scenarios', 'Analytics', 'Risks', 'Review'].map((tab) => (
          <button key={tab} style={tabStyle}>
            {tab}
          </button>
        ))}
      </div>

      {/* Content area — for MVP show generator placeholder */}
      <div style={{
        flex: '1 1 0',
        padding: '24px',
        display: 'flex' as const,
        flexDirection: 'column' as const,
        gap: '16px',
      }}>
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: '10px', padding: '20px',
          textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px',
        }}>
          <div style={{ marginBottom: 12 }}>🚀</div>
          <p style={{ margin: '0 0 8px' }}>Workbench loaded with {artifacts.length} artifact{artifacts.length !== 1 ? 's' : ''}.</p>
          <p style={{ margin: 0, fontSize: '13px' }}>
            {epicArtifact ? '✓ Epic Map saved' : '— No Epic Map yet'}
            {storiesArtifact ? ' | ✓ User Stories saved' : ' | — No User Stories yet'}
          </p>
          <p style={{ margin: '12px 0 0', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            Generator module wiring coming in next iteration.
          </p>
        </div>

        {/* Autosave test trigger */}
        <button
          onClick={() => onStateChange({ test: Date.now() })}
          style={{ alignSelf: 'flex-start', ...tabStyle }}
        >
          Trigger autosave
        </button>
      </div>
    </div>
  )
}

const tabStyle: React.CSSProperties = {
  padding: '8px 14px', borderRadius: '6px 6px 0 0', border: 'none',
  background: 'transparent', color: 'var(--color-text-secondary)',
  fontSize: '13px', cursor: 'pointer',
}