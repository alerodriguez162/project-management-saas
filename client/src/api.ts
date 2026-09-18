import type { HealthResponse, Membership, Workspace, WorkspaceRole } from './types'

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    if (body.error) return body.error
  } catch {
    // keep fallback
  }
  return fallback
}

async function parseJson<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    throw new Error(await readError(res, fallback))
  }
  return res.json() as Promise<T>
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/health')
  return parseJson(res, `Health check falló (HTTP ${res.status})`)
}

export async function fetchWorkspaces(): Promise<Workspace[]> {
  const res = await fetch('/api/workspaces')
  return parseJson(res, `No se pudieron cargar los workspaces (HTTP ${res.status})`)
}

export async function createWorkspace(input: {
  name: string
  ownerEmail: string
}): Promise<Workspace> {
  const res = await fetch('/api/workspaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson(res, `No se pudo crear el workspace (HTTP ${res.status})`)
}

export async function deleteWorkspace(id: string): Promise<void> {
  const res = await fetch(`/api/workspaces/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    throw new Error(await readError(res, `No se pudo eliminar el workspace (HTTP ${res.status})`))
  }
}

export async function fetchMembers(workspaceId: string): Promise<Membership[]> {
  const res = await fetch(`/api/workspaces/${workspaceId}/members`)
  return parseJson(res, `No se pudieron cargar los miembros (HTTP ${res.status})`)
}

export async function createMember(
  workspaceId: string,
  input: { email: string; role: WorkspaceRole },
): Promise<Membership> {
  const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson(res, `No se pudo agregar el miembro (HTTP ${res.status})`)
}

export async function deleteMember(workspaceId: string, memberId: string): Promise<void> {
  const res = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error(await readError(res, `No se pudo quitar el miembro (HTTP ${res.status})`))
  }
}
