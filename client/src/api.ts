import type {
  HealthResponse,
  Issue,
  IssueFilters,
  IssuePriority,
  IssueStatus,
  Membership,
  Project,
  Workspace,
  WorkspaceRole,
  WorkspaceStats,
} from './types'

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

export async function fetchWorkspaceStats(workspaceId: string): Promise<WorkspaceStats> {
  const res = await fetch(`/api/workspaces/${workspaceId}/stats`)
  return parseJson(res, `No se pudieron cargar las métricas (HTTP ${res.status})`)
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

export async function updateMember(
  workspaceId: string,
  memberId: string,
  role: WorkspaceRole,
): Promise<Membership> {
  const res = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  })
  return parseJson(res, `No se pudo actualizar el rol (HTTP ${res.status})`)
}

export async function deleteMember(workspaceId: string, memberId: string): Promise<void> {
  const res = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error(await readError(res, `No se pudo quitar el miembro (HTTP ${res.status})`))
  }
}

export async function fetchProjects(workspaceId: string): Promise<Project[]> {
  const res = await fetch(`/api/workspaces/${workspaceId}/projects`)
  return parseJson(res, `No se pudieron cargar los proyectos (HTTP ${res.status})`)
}

export async function createProject(
  workspaceId: string,
  input: { name: string; key?: string; description?: string },
): Promise<Project> {
  const res = await fetch(`/api/workspaces/${workspaceId}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson(res, `No se pudo crear el proyecto (HTTP ${res.status})`)
}

export async function deleteProject(workspaceId: string, projectId: string): Promise<void> {
  const res = await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error(await readError(res, `No se pudo eliminar el proyecto (HTTP ${res.status})`))
  }
}

function issueQuery(filters: IssueFilters = {}): string {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.priority) params.set('priority', filters.priority)
  if (filters.assignee) params.set('assignee', filters.assignee)
  if (filters.q) params.set('q', filters.q)
  const query = params.toString()
  return query ? `?${query}` : ''
}

export async function fetchIssues(
  workspaceId: string,
  projectId: string,
  filters: IssueFilters = {},
): Promise<Issue[]> {
  const res = await fetch(
    `/api/workspaces/${workspaceId}/projects/${projectId}/issues${issueQuery(filters)}`,
  )
  return parseJson(res, `No se pudieron cargar los issues (HTTP ${res.status})`)
}

export async function createIssue(
  workspaceId: string,
  projectId: string,
  input: {
    title: string
    description?: string
    status?: IssueStatus
    priority?: IssuePriority
    assigneeId?: string | null
  },
): Promise<Issue> {
  const res = await fetch(`/api/workspaces/${workspaceId}/projects/${projectId}/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return parseJson(res, `No se pudo crear el issue (HTTP ${res.status})`)
}

export async function updateIssue(
  workspaceId: string,
  projectId: string,
  issueId: string,
  input: {
    title?: string
    description?: string | null
    status?: IssueStatus
    priority?: IssuePriority
    assigneeId?: string | null
  },
): Promise<Issue> {
  const res = await fetch(
    `/api/workspaces/${workspaceId}/projects/${projectId}/issues/${issueId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
  return parseJson(res, `No se pudo actualizar el issue (HTTP ${res.status})`)
}

export async function deleteIssue(
  workspaceId: string,
  projectId: string,
  issueId: string,
): Promise<void> {
  const res = await fetch(
    `/api/workspaces/${workspaceId}/projects/${projectId}/issues/${issueId}`,
    { method: 'DELETE' },
  )
  if (!res.ok) {
    throw new Error(await readError(res, `No se pudo eliminar el issue (HTTP ${res.status})`))
  }
}
