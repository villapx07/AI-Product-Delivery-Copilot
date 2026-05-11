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

// ── Generation (modular, per-module) ──────────────────────────────────────────

/**
 * Modular SSE generator for a single workbench module.
 * Returns a ReadableStream<Uint8Array> that emits SSE events.
 */
export function generateModuleStream(workbenchId: string, module: string, regenerate = false): ReadableStream<Uint8Array> {
  const headers = getAuthHeaders()
  const url = `/api/generate/modular`
  let consumed = false

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify({ workbench_id: workbenchId, module, regenerate }),
        })

        if (!response.ok || !response.body) {
          controller.close()
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data:')) {
              const data = line.slice(5).trim()
              if (data && !consumed) {
                controller.enqueue(new TextEncoder().encode(`data: ${data}\n`))
              }
            }
          }
        }
      } catch (e) {
        // client disconnected
      } finally {
        controller.close()
      }
    },
  })

  return stream
}

/** Parse SSE string into module name → data object. Returns null until module_complete. */
export function parseModuleSSE(sseText: string): { module: string; data: unknown } | null {
  const lines = sseText.split('\n')
  let eventType = ''
  let eventData = ''

  for (const line of lines) {
    if (line.startsWith('event:')) eventType = line.slice(6).trim()
    if (line.startsWith('data:')) eventData = line.slice(5).trim()
    if (line === '') {
      // End of event
      if (eventType === 'module_data' && eventData) {
        try {
          return { module: eventType, data: JSON.parse(eventData) }
        } catch {}
      }
      eventType = ''
      eventData = ''
    }
  }
  return null
}

export function parseModuleSSEFromText(text: string): { module: string; data: Record<string, unknown> } | null {
  try {
    const parsed = JSON.parse(text)
    const key = Object.keys(parsed)[0]
    return key ? { module: key, data: parsed[key] as Record<string, unknown> } : null
  } catch {
    return null
  }
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