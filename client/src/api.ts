import type { HealthResponse } from './types'

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    if (body.error) return body.error
  } catch {
    // keep fallback
  }
  return fallback
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/health')
  if (!res.ok) {
    throw new Error(await readError(res, `Health check falló (HTTP ${res.status})`))
  }
  return res.json() as Promise<HealthResponse>
}
