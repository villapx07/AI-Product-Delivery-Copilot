'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { workbenchesApi } from '@/lib/api'

interface Props {
  onClose: () => void
  onCreated: (workbench: { id: string; title: string }) => void
}

export function CreateWorkbenchModal({ onClose, onCreated }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [businessObjective, setBusinessObjective] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await workbenchesApi.create({
        title: title.trim(),
        business_objective: businessObjective.trim(),
      })
      onCreated({ id: res.id, title: res.title })
      onClose()
      router.push(`/workbench/${res.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create workbench')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: '24px',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '12px', width: '100%', maxWidth: '520px',
        padding: '28px 28px 24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
            New Workbench
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: '20px', padding: '2px 6px' }}>×</button>
        </div>

        {error && (
          <div style={errorStyle}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Workbench title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus
              placeholder="e.g., BNPL Checkout Feature Q2" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Business objective</label>
            <textarea value={businessObjective} onChange={(e) => setBusinessObjective(e.target.value)} rows={3}
              placeholder="What problem are we solving? What's the expected outcome?"
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button type="button" onClick={onClose} style={btnSecondaryStyle}>Cancel</button>
            <button type="submit" disabled={loading} style={{ ...btnPrimaryStyle, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Creating…' : 'Create workbench'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '6px',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--color-border)',
  background: 'var(--color-bg)', color: 'var(--color-text-primary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
}
const btnPrimaryStyle: React.CSSProperties = {
  padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff',
  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
}
const btnSecondaryStyle: React.CSSProperties = {
  padding: '9px 18px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'transparent',
  color: 'var(--color-text-primary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
}
const errorStyle: React.CSSProperties = {
  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
  borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#ef4444', marginBottom: '16px',
}