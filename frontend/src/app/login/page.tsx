'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard')
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await authApi.login(email, password, rememberMe)
      login(res.user, res.access_token)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err?.message?.includes('401')
        ? 'Invalid email or password'
        : err?.message || 'Login failed. Please try again.')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg)', padding: '24px',
    }}>
      <div style={{
        width: '100%', maxWidth: '400px', background: 'var(--color-surface)',
        border: '1px solid var(--color-border)', borderRadius: '12px', padding: '40px 36px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
            <img src="/forge-logo.png" alt="Forge" width={36} height={36} style={{ borderRadius: '8px' }} />
            <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Forge</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
            AI Product Delivery Copilot
          </p>
        </div>

        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus
              placeholder="you@company.com" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              placeholder="••••••••" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: 'var(--color-primary)' }} />
              Remember me
            </label>
          </div>
          <button type="submit" style={{ ...buttonStyle }}>
            Sign in
          </button>
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
const buttonStyle: React.CSSProperties = {
  padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'var(--color-primary)',
  color: '#fff', fontSize: '14px', fontWeight: 600, marginTop: '4px', cursor: 'pointer',
}
const errorStyle: React.CSSProperties = {
  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
  borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#ef4444', marginBottom: '20px',
}