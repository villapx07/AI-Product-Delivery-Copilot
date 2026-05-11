/**
 * Auth store — Zustand with localStorage persistence
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        }),

      setUser: (user) =>
        set({
          user,
          isAuthenticated: true,
        }),
    }),
    {
      name: 'forge-auth', // localStorage key
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// Helpers
export function getToken(): string | null {
  // For use in API layer (runs outside React) — read from localStorage directly
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('forge-auth')
      if (raw) {
        const parsed = JSON.parse(raw)
        return parsed.state?.token ?? null
      }
    } catch {}
  }
  return useAuthStore.getState().token
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken()
  if (!token) return {}
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}