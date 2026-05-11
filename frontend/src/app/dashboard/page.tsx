'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { workbenchesApi } from '@/lib/api'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { CreateWorkbenchModal } from '@/components/dashboard/CreateWorkbenchModal'

interface Workbench {
  id: string
  title: string
  status: string
  created_at: string
  updated_at: string
  last_opened_at: string | null
  owner_id: string
  artifact_count?: number
  business_objective?: string
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  IN_PROGRESS: '#3b82f6',
  REVIEW: '#f59e0b',
  ARCHIVED: '#9ca3af',
}
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  ARCHIVED: 'Archived',
}

export default function DashboardPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [showCreate, setShowCreate] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) router.replace('/login')
  }, [isAuthenticated, router])

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div style={{ width: 24, height: 24, border: '2px solid var(--color-border)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['workbenches'],
    queryFn: () => workbenchesApi.list({ sort: 'last_opened_at', order: 'desc' }),
    enabled: !!user,
  })

  const workbenches: Workbench[] = data?.workbenches || []

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <DashboardHeader user={user!} />
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>
              My Workbenches
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0 }}>
              {workbenches.length} workbench{workbenches.length !== 1 ? 'es' : ''}
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} style={btnPrimaryStyle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Workbench
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={errorStyle}>
            Failed to load workbenches. Is the backend running?
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-text-secondary)', fontSize: '14px', padding: '20px 0' }}>
            <div style={spinnerStyle} />
            Loading workbenches…
          </div>
        )}

        {/* Empty */}
        {!isLoading && workbenches.length === 0 && !error && (
          <div style={emptyStyle}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>
              No workbenches yet
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: '0 0 20px' }}>
              Create your first workbench to start generating AI-powered product deliverables.
            </p>
            <button onClick={() => setShowCreate(true)} style={{ ...btnPrimaryStyle, display: 'inline-flex', gap: '6px' }}>
              + New Workbench
            </button>
          </div>
        )}

        {/* Grid */}
        {!isLoading && workbenches.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {workbenches.map((wb) => (
              <WorkbenchCard key={wb.id} workbench={wb} />
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateWorkbenchModal
          onClose={() => setShowCreate(false)}
          onCreated={(wb) => console.log('Created:', wb.id)}
        />
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function WorkbenchCard({ workbench }: { workbench: Workbench }) {
  const router = useRouter()
  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Never opened'
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }
  return (
    <div style={cardStyle}
      onClick={() => router.push(`/workbench/${workbench.id}`)}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = '#3b82f6'
        el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'var(--color-border)'
        el.style.boxShadow = 'none'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: STATUS_COLORS[workbench.status] || '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {STATUS_LABELS[workbench.status] || workbench.status}
        </span>
      </div>
      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 6px', lineHeight: 1.3 }}>
        {workbench.title}
      </h3>
      {workbench.business_objective && (
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 12px', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {workbench.business_objective}
        </p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          {timeAgo(workbench.last_opened_at || workbench.updated_at)}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          {workbench.artifact_count || 0} module{workbench.artifact_count !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}

const btnPrimaryStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '6px',
  padding: '9px 16px', borderRadius: '8px', border: 'none',
  background: '#3b82f6', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
}
const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px',
  padding: '18px 20px', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s',
}
const emptyStyle: React.CSSProperties = {
  textAlign: 'center', padding: '64px 24px', background: 'var(--color-surface)',
  border: '1px solid var(--color-border)', borderRadius: '12px',
}
const errorStyle: React.CSSProperties = {
  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
  borderRadius: '8px', padding: '14px 18px', fontSize: '14px', color: '#ef4444',
}
const spinnerStyle: React.CSSProperties = {
  width: 16, height: 16, border: '2px solid var(--color-border)', borderTopColor: '#3b82f6',
  borderRadius: '50%', animation: 'spin 0.8s linear infinite',
}