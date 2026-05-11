'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { usersApi } from '@/lib/api'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'

interface User {
  id: string
  name: string
  email: string
  role: string
  status: string
  created_at: string
  last_login: string | null
}

const ROLES = ['PRODUCT_MANAGER', 'VIEWER', 'ADMIN', 'SUPER_ADMIN']
const STATUSES = ['ACTIVE', 'DISABLED', 'PENDING']
const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: '#a855f7', ADMIN: '#3b82f6',
  PRODUCT_MANAGER: '#22c55e', VIEWER: '#6b7280',
}
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#22c55e', DISABLED: '#ef4444', PENDING: '#f59e0b',
}

export default function AdminUsersPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [showCreate, setShowCreate] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const qc = useQueryClient()

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login')
  }, [isAuthenticated, router])

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => usersApi.list(),
    enabled: !!user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'),
  })

  const users: User[] = data?.users || []

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, string>) =>
      usersApi.update(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setEditingUser(null) },
  })

  const createMutation = useMutation({
    mutationFn: (body: { name: string; email: string; password: string; role: string }) =>
      usersApi.create(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setShowCreate(false) },
  })

  if (!user) return null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <DashboardHeader user={user} />

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 4px' }}>
              User Management
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0 }}>
              {users.length} user{users.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} style={btnPrimaryStyle}>
            + Create user
          </button>
        </div>

        {error && <div style={errorStyle}>Failed to load users.</div>}

        {isLoading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--color-text-secondary)', padding: '20px 0' }}>
            <div style={spinnerStyle} /> Loading…
          </div>
        )}

        {!isLoading && (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Name', 'Email', 'Role', 'Status', 'Last login', 'Actions'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', background: '#3b82f6',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 13, fontWeight: 600,
                        }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{u.name}</span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--color-text-secondary)', fontSize: 13 }}>{u.email}</td>
                    <td style={tdStyle}>
                      <span style={{ ...badgeStyle, color: ROLE_COLORS[u.role] || '#6b7280', borderColor: ROLE_COLORS[u.role] || '#6b7280' }}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ ...badgeStyle, color: STATUS_COLORS[u.status] || '#6b7280', borderColor: STATUS_COLORS[u.status] || '#6b7280' }}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--color-text-secondary)', fontSize: 13 }}>
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => setEditingUser(u)}
                          style={{ ...actionBtnStyle, color: '#3b82f6' }}
                        >
                          Edit
                        </button>
                        {u.id !== user.id && (
                          <button
                            onClick={() => updateMutation.mutate({ id: u.id, status: u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' })}
                            style={{ ...actionBtnStyle, color: u.status === 'ACTIVE' ? '#ef4444' : '#22c55e' }}
                          >
                            {u.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Create modal */}
      {showCreate && (
        <UserFormModal
          title="Create user"
          onClose={() => setShowCreate(false)}
          onSubmit={(data) => createMutation.mutate(data as any)}
          loading={createMutation.isPending}
          error={createMutation.error?.message}
        />
      )}

      {/* Edit modal */}
      {editingUser && (
        <UserFormModal
          title={`Edit: ${editingUser.name}`}
          initial={{ name: editingUser.name, email: editingUser.email, role: editingUser.role }}
          onClose={() => setEditingUser(null)}
          onSubmit={(data) => updateMutation.mutate({ id: editingUser.id, ...data })}
          loading={updateMutation.isPending}
          error={updateMutation.error?.message}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function UserFormModal({
  title, initial = { name: '', email: '', role: 'PRODUCT_MANAGER' }, onClose, onSubmit, loading, error,
}: {
  title: string
  initial?: { name: string; email: string; role: string }
  onClose: () => void
  onSubmit: (data: { name: string; email: string; password?: string; role: string }) => void
  loading: boolean
  error?: string
}) {
  const [name, setName] = useState(initial?.name || '')
  const [email, setEmail] = useState(initial?.email || '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(initial?.role || 'PRODUCT_MANAGER')

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24,
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '28px 28px 24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: '20px', padding: '2px 6px' }}>×</button>
        </div>
        {error && <div style={errorStyle}>{error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} autoFocus />
          </div>
          <div>
            <label style={labelStyle}>Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          </div>
          {!initial && (
            <div>
              <label style={labelStyle}>Password *</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
            </div>
          )}
          <div>
            <label style={labelStyle}>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={onClose} style={btnSecondaryStyle}>Cancel</button>
            <button
              onClick={() => onSubmit({ name, email, ...(password ? { password } : {}), role })}
              disabled={loading || !name || !email}
              style={{ ...btnPrimaryStyle, opacity: loading || !name || !email ? 0.6 : 1 }}
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'var(--color-bg)' }
const tdStyle: React.CSSProperties = { padding: '14px 16px', fontSize: 14 }
const badgeStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, border: '1px solid', textTransform: 'uppercase', letterSpacing: '0.3px' }
const actionBtnStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, padding: '4px 8px' }
const btnPrimaryStyle: React.CSSProperties = { padding: '9px 16px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const btnSecondaryStyle: React.CSSProperties = { padding: '9px 16px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-primary)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }
const errorStyle: React.CSSProperties = { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ef4444', marginBottom: 16 }
const spinnerStyle: React.CSSProperties = { width: 16, height: 16, border: '2px solid var(--color-border)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }