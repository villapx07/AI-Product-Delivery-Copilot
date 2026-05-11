'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

interface Props {
  user: {
    name: string
    email: string
    role: string
  }
}

export function DashboardHeader({ user }: Props) {
  const router = useRouter()
  const logout = useAuthStore((s) => s.logout)
  const [showMenu, setShowMenu] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: '#a855f7',
    ADMIN: '#3b82f6',
    PRODUCT_MANAGER: '#22c55e',
    VIEWER: '#6b7280',
  }

  return (
    <header style={{
      height: '56px',
      background: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      {/* Left: Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img src="/forge-logo.png" alt="Forge" width={28} height={28} style={{ borderRadius: '6px' }} />
        <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text-primary)' }}>
          Forge
        </span>
        <span style={{
          fontSize: '12px',
          color: 'var(--color-text-secondary)',
          borderLeft: '1px solid var(--color-border)',
          paddingLeft: '10px',
          marginLeft: '2px',
        }}>
          Delivery
        </span>
      </div>

      {/* Right: User */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowMenu((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '6px 10px',
            cursor: 'pointer',
          }}
        >
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 600,
          }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {user.name}
            </div>
            <div style={{
              fontSize: '11px',
              color: roleColors[user.role] || '#6b7280',
              fontWeight: 500,
            }}>
              {user.role.replace('_', ' ')}
            </div>
          </div>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: '4px' }}>
            <path d="M3 4.5L6 7.5L9 4.5" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {showMenu && (
          <div style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 6px)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            minWidth: '160px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            zIndex: 100,
            overflow: 'hidden',
          }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              {user.email}
            </div>
            {user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' ? (
              <button
                onClick={() => { router.push('/admin/users'); setShowMenu(false) }}
                style={menuItemStyle}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                User Management
              </button>
            ) : null}
            <button onClick={handleLogout} style={{ ...menuItemStyle, color: '#ef4444' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

const menuItemStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '9px 12px',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontSize: '13px',
  color: 'var(--color-text-primary)',
  textAlign: 'left',
}