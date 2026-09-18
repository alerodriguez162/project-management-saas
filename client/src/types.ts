export type HealthResponse = {
  status: string
  service: string
  product: string
  timestamp: string
}

export type WorkspaceRole = 'owner' | 'admin' | 'member'

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

export type NavItem = {
  id: string
  label: string
  hint: string
}

export const WORKSPACE_ROLES: WorkspaceRole[] = ['owner', 'admin', 'member']

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Miembro',
}
