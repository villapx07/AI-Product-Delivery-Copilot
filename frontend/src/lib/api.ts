// API client for FastAPI backend
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface GenerateInputs {
  feature_title: string
  business_objective: string
  problem_statement?: string
  success_metrics?: string
  constraints?: string
  assumptions?: string
  impacted_teams: string[]
  uploaded_files: string[] // base64 encoded
  file_names: string[]
}

export async function* streamGenerate(
  inputs: GenerateInputs
): AsyncGenerator<string, void, unknown> {
  const response = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputs),
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()

  if (!reader) return

  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        yield line.slice(6)
      }
    }
  }
}
