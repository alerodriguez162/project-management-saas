export type WorkspaceRole = 'owner' | 'admin' | 'member'
export type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'done'
export type IssuePriority = 'low' | 'medium' | 'high'

export const WORKSPACE_ROLES: WorkspaceRole[] = ['owner', 'admin', 'member']
export const ISSUE_STATUSES: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'done']
export const ISSUE_PRIORITIES: IssuePriority[] = ['low', 'medium', 'high']

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

export type CreateWorkspaceInput = {
  name: string
  ownerEmail: string
}

export type UpdateWorkspaceInput = {
  name?: string
}

export type CreateMembershipInput = {
  email: string
  role?: WorkspaceRole
}

export type UpdateMembershipInput = {
  role: WorkspaceRole
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

export type CreateProjectInput = {
  name: string
  key?: string
  description?: string | null
}

export type UpdateProjectInput = {
  name?: string
  description?: string | null
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

export type CreateIssueInput = {
  title: string
  description?: string | null
  status?: IssueStatus
  priority?: IssuePriority
  assigneeId?: string | null
}

export type UpdateIssueInput = {
  title?: string
  description?: string | null
  status?: IssueStatus
  priority?: IssuePriority
  assigneeId?: string | null
}

export type IssueFilters = {
  status?: IssueStatus
  priority?: IssuePriority
  assigneeId?: string | 'unassigned'
  q?: string
}

export type WorkspaceStats = {
  memberCount: number
  projectCount: number
  issueCount: number
  openIssueCount: number
}
