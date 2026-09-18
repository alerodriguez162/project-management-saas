export type WorkspaceRole = 'owner' | 'admin' | 'member'

export type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'done'
export type IssuePriority = 'low' | 'medium' | 'high'

export const WORKSPACE_ROLES: WorkspaceRole[] = ['owner', 'admin', 'member']

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
}

export type Issue = {
  id: string
  projectId: string
  title: string
  description: string | null
  status: IssueStatus
  priority: IssuePriority
  createdAt: string
}
