export type HealthResponse = {
  status: string
  service: string
  product: string
  timestamp: string
}

export type WorkspaceRole = 'owner' | 'admin' | 'member'
export type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'done'
export type IssuePriority = 'low' | 'medium' | 'high'

export type Workspace = {
  id: string
  name: string
  slug: string
  createdAt: string
  updatedAt: string
  memberCount: number
}

export type Membership = {
  id: string
  workspaceId: string
  email: string
  role: WorkspaceRole
  createdAt: string
}

export type WorkspaceStats = {
  memberCount: number
  projectCount: number
  issueCount: number
  openIssueCount: number
}

export type Project = {
  id: string
  workspaceId: string
  name: string
  key: string
  description: string | null
  createdAt: string
  updatedAt: string
  issueCount: number
}

export type Issue = {
  id: string
  projectId: string
  number: number
  key: string
  title: string
  description: string | null
  status: IssueStatus
  priority: IssuePriority
  assigneeId: string | null
  assigneeEmail: string | null
  createdAt: string
  updatedAt: string
}

export type IssueFilters = {
  status?: IssueStatus
  priority?: IssuePriority
  assignee?: string
  q?: string
}

export type Notice = {
  type: 'error' | 'success'
  message: string
}

export const WORKSPACE_ROLES: WorkspaceRole[] = ['owner', 'admin', 'member']
export const ISSUE_STATUSES: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'done']
export const ISSUE_PRIORITIES: IssuePriority[] = ['low', 'medium', 'high']

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Miembro',
}

export const STATUS_LABELS: Record<IssueStatus, string> = {
  backlog: 'Backlog',
  todo: 'Por hacer',
  in_progress: 'En progreso',
  done: 'Hecho',
}

export const PRIORITY_LABELS: Record<IssuePriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
}
