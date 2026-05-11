/**
 * API client — thin wrapper around fetch with auth headers injected.
 * All API calls go through here so token management is centralized.
 */
import { getAuthHeaders } from '@/store/authStore'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function request(
  path: string,
  options: RequestInit = {},
): Promise<any> {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401 || response.status === 403) {
    // Token expired/invalid — clear session (handled by caller)
    throw new Error(`Auth error ${response.status}`)
  }

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`API ${response.status}: ${body}`)
  }

  return response.json()
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string, remember_me: boolean = false) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, remember_me }),
      headers: { 'Content-Type': 'application/json' },
    }),

  logout: () =>
    request('/api/auth/logout', { method: 'POST' }),

  getMe: () => request('/api/auth/me'),
}

// ── Users (admin) ─────────────────────────────────────────────────────────────

export const usersApi = {
  list: () => request('/api/users'),
  create: (data: { name: string; email: string; password: string; role: string }) =>
    request('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (userId: string, data: { name?: string; role?: string; status?: string }) =>
    request(`/api/users/${userId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  resetPassword: (userId: string, newPassword: string) =>
    request(`/api/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword }),
    }),
  delete: (userId: string) =>
    request(`/api/users/${userId}`, { method: 'DELETE' }),
}

// ── Workbenches ───────────────────────────────────────────────────────────────

export const workbenchesApi = {
  list: (params?: { sort?: string; order?: string; status?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return request(`/api/workbenches${qs ? `?${qs}` : ''}`)
  },
  create: (data: {
    title: string
    description?: string
    business_objective?: string
    problem_statement?: string
    success_metrics?: string
    constraints?: string
    rollout_assumptions?: string
    impacted_teams?: string
  }) => request('/api/workbenches', { method: 'POST', body: JSON.stringify(data) }),
  get: (workbenchId: string) => request(`/api/workbenches/${workbenchId}`),
  update: (workbenchId: string, data: Record<string, any>) =>
    request(`/api/workbenches/${workbenchId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  autosave: (workbenchId: string, data: Record<string, any>) =>
    request(`/api/workbenches/${workbenchId}/autosave`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (workbenchId: string) =>
    request(`/api/workbenches/${workbenchId}`, { method: 'DELETE' }),
}

// ── Artifacts ─────────────────────────────────────────────────────────────────

export const artifactsApi = {
  save: (
    workbenchId: string,
    data: {
      artifact_type: string
      content_json: string
      llm_provider?: string
      llm_model?: string
      generation_prompt?: string
      raw_response?: string
    },
  ) => request(`/api/artifacts/workbench/${workbenchId}`, { method: 'POST', body: JSON.stringify(data) }),
  list: (workbenchId: string, type?: string) => {
    const qs = type ? `?type=${type}` : ''
    return request(`/api/artifacts/workbench/${workbenchId}${qs}`)
  },
  get: (artifactId: string) => request(`/api/artifacts/${artifactId}`),
  delete: (artifactId: string) =>
    request(`/api/artifacts/${artifactId}`, { method: 'DELETE' }),
}