/**
 * Auth store — Zustand with localStorage persistence.
 * Holds user session state (non-server state).
 * Auth API calls go through React Query; this store mirrors auth state for UI.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  name: string
  email: string
  role: string
  status: string
  created_at: string | null
  last_login: string | null
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean

  // Actions
  login: (user: User, token: string) => void
  logout: () => void
  setUser: (user: User) => void
}

const PARTIALIZE = (state: AuthState) => ({
  user: state.user,
  token: state.token,
  isAuthenticated: state.isAuthenticated,
})

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login(user, token) {
        set({ user, token, isAuthenticated: true })
      },

      logout() {
        set({ user: null, token: null, isAuthenticated: false })
      },

      setUser(user) {
        set({ user, isAuthenticated: true })
      },
    }),
    {
      name: 'forge-auth',
      partialize: PARTIALIZE,
    }
  )
)

// Helpers
export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('forge-auth')
      if (raw) {
        const parsed = JSON.parse(raw)
        return parsed.state?.token ?? null
      }
    } catch {
      // ignore
    }
  }
  return useAuthStore.getState().token
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken()
  if (!token) return {}
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}