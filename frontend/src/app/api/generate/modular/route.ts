import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || ''
    const body = await request.json()

    // User Stories can take ~120s. Buffer the full response before sending
    // to avoid SSE streaming issues with long-running backend generation.
    const response = await fetch(`${API_BASE}/api/generate/modular`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
      body: JSON.stringify(body),
      // Allow up to 5 minutes for the backend to complete
      signal: AbortSignal.timeout(300_000),
    })

    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json(
        { error: `Backend error: ${response.status}`, detail: text },
        { status: response.status }
      )
    }

    // Read the complete SSE body before forwarding.
    // The backend generates synchronously so this completes in < 180s.
    const text = await response.text()

    return new Response(text, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    const isTimeout = error?.name === 'TimeoutError' || error?.message?.includes('timeout') || error?.code === 'ETIMEDOUT'
    return NextResponse.json(
      {
        error: isTimeout ? 'Generation timed out after 5 minutes. Please try regenerating.' : 'Proxy error',
        detail: isTimeout ? undefined : String(error),
      },
      { status: isTimeout ? 504 : 500 }
    )
  }
}