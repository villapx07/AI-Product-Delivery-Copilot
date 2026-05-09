import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// GET /api/config — fetch current LLM config
export async function GET() {
  try {
    const response = await fetch(`${API_BASE}/api/config`)
    if (!response.ok) return NextResponse.json({ error: 'Failed to fetch config' }, { status: response.status })
    return NextResponse.json(await response.json())
  } catch {
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 })
  }
}

// PATCH /api/config — update LLM config
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const response = await fetch(`${API_BASE}/api/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) return NextResponse.json({ error: 'Failed to update config' }, { status: response.status })
    return NextResponse.json(await response.json())
  } catch {
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 })
  }
}