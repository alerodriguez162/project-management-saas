import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  CreateIssueInput,
  CreateMembershipInput,
  CreateProjectInput,
  CreateWorkspaceInput,
  Issue,
  IssueFilters,
  IssuePriority,
  IssueStatus,
  Membership,
  Project,
  UpdateIssueInput,
  UpdateMembershipInput,
  UpdateProjectInput,
  UpdateWorkspaceInput,
  Workspace,
  WorkspaceRole,
  WorkspaceStats,
} from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '..', 'data')
const dbPath = path.join(dataDir, 'mesa.db')

fs.mkdirSync(dataDir, { recursive: true })

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS memberships (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    created_at TEXT NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    UNIQUE (workspace_id, email)
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    key TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    UNIQUE (workspace_id, key)
  );

  CREATE TABLE IF NOT EXISTS issues (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('backlog', 'todo', 'in_progress', 'done')),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    assignee_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES memberships(id) ON DELETE SET NULL,
    UNIQUE (project_id, number)
  );

  CREATE INDEX IF NOT EXISTS idx_memberships_workspace ON memberships(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id);
  CREATE INDEX IF NOT EXISTS idx_issues_project ON issues(project_id);
  CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
  CREATE INDEX IF NOT EXISTS idx_issues_assignee ON issues(assignee_id);
`)

type WorkspaceRow = {
  id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
  member_count: number
}

type MembershipRow = {
  id: string
  workspace_id: string
  email: string
  role: WorkspaceRole
  created_at: string
}

type ProjectRow = {
  id: string
  workspace_id: string
  name: string
  key: string
  description: string | null
  created_at: string
  updated_at: string
  issue_count: number
}

type IssueRow = {
  id: string
  project_id: string
  number: number
  project_key: string
  title: string
  description: string | null
  status: IssueStatus
  priority: IssuePriority
  assignee_id: string | null
  assignee_email: string | null
  created_at: string
  updated_at: string
}

function mapWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    memberCount: row.member_count,
  }
}

function mapMembership(row: MembershipRow): Membership {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
  }
}

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    key: row.key,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    issueCount: row.issue_count,
  }
}

function mapIssue(row: IssueRow): Issue {
  return {
    id: row.id,
    projectId: row.project_id,
    number: row.number,
    key: `${row.project_key}-${row.number}`,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assigneeId: row.assignee_id,
    assigneeEmail: row.assignee_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const WORKSPACE_SELECT = `
  SELECT w.id, w.name, w.slug, w.created_at, w.updated_at,
         COUNT(m.id) AS member_count
  FROM workspaces w
  LEFT JOIN memberships m ON m.workspace_id = w.id
`

const PROJECT_SELECT = `
  SELECT p.id, p.workspace_id, p.name, p.key, p.description, p.created_at, p.updated_at,
         COUNT(i.id) AS issue_count
  FROM projects p
  LEFT JOIN issues i ON i.project_id = p.id
`

const ISSUE_SELECT = `
  SELECT i.id, i.project_id, i.number, p.key AS project_key, i.title, i.description,
         i.status, i.priority, i.assignee_id, m.email AS assignee_email,
         i.created_at, i.updated_at
  FROM issues i
  JOIN projects p ON p.id = i.project_id
  LEFT JOIN memberships m ON m.id = i.assignee_id
`

function slugify(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)

  return base || 'workspace'
}

function slugExists(slug: string, excludeId?: string): boolean {
  const row = excludeId
    ? db.prepare('SELECT id FROM workspaces WHERE slug = ? AND id != ?').get(slug, excludeId)
    : db.prepare('SELECT id FROM workspaces WHERE slug = ?').get(slug)
  return Boolean(row)
}

function uniqueSlug(name: string, excludeId?: string): string {
  const base = slugify(name)
  let slug = base
  let n = 2
  while (slugExists(slug, excludeId)) {
    slug = `${base}-${n}`
    n += 1
  }
  return slug
}

export function keyFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const fromWords = words
    .map((word) => word.normalize('NFD').replace(/\p{M}/gu, '')[0] ?? '')
    .join('')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 6)

  if (fromWords.length >= 2) return fromWords

  const compact = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 4)

  return compact.padEnd(3, 'X').slice(0, 4)
}

function projectKeyTaken(workspaceId: string, key: string, excludeId?: string): boolean {
  const row = excludeId
    ? db
        .prepare('SELECT id FROM projects WHERE workspace_id = ? AND key = ? AND id != ?')
        .get(workspaceId, key, excludeId)
    : db.prepare('SELECT id FROM projects WHERE workspace_id = ? AND key = ?').get(workspaceId, key)
  return Boolean(row)
}

export function uniqueProjectKey(workspaceId: string, desired: string): string {
  const base = desired.replace(/[^A-Z]/g, '').slice(0, 6) || 'PRJ'
  let key = base.slice(0, 6)
  let n = 2
  while (projectKeyTaken(workspaceId, key)) {
    const suffix = String(n)
    key = `${base.slice(0, Math.max(2, 6 - suffix.length))}${suffix}`
    n += 1
  }
  return key
}

export function listWorkspaces(): Workspace[] {
  const rows = db
    .prepare(`${WORKSPACE_SELECT} GROUP BY w.id ORDER BY w.created_at DESC`)
    .all() as WorkspaceRow[]
  return rows.map(mapWorkspace)
}

export function getWorkspaceById(id: string): Workspace | undefined {
  const row = db.prepare(`${WORKSPACE_SELECT} WHERE w.id = ? GROUP BY w.id`).get(id) as
    | WorkspaceRow
    | undefined
  return row ? mapWorkspace(row) : undefined
}

export function createWorkspace(input: CreateWorkspaceInput): Workspace {
  const now = new Date().toISOString()
  const workspaceId = crypto.randomUUID()
  const name = input.name.trim()
  const slug = uniqueSlug(name)
  const email = input.ownerEmail.trim().toLowerCase()

  const insert = db.transaction(() => {
    db.prepare(
      `INSERT INTO workspaces (id, name, slug, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(workspaceId, name, slug, now, now)

    db.prepare(
      `INSERT INTO memberships (id, workspace_id, email, role, created_at)
       VALUES (?, ?, ?, 'owner', ?)`,
    ).run(crypto.randomUUID(), workspaceId, email, now)
  })

  insert()
  return getWorkspaceById(workspaceId)!
}

export function updateWorkspace(id: string, input: UpdateWorkspaceInput): Workspace | undefined {
  const existing = getWorkspaceById(id)
  if (!existing) return undefined

  const name = input.name !== undefined ? input.name.trim() : existing.name
  const slug = input.name !== undefined ? uniqueSlug(name, id) : existing.slug
  const updatedAt = new Date().toISOString()

  db.prepare(
    `UPDATE workspaces SET name = ?, slug = ?, updated_at = ? WHERE id = ?`,
  ).run(name, slug, updatedAt, id)

  return getWorkspaceById(id)
}

export function deleteWorkspace(id: string): boolean {
  const result = db.prepare('DELETE FROM workspaces WHERE id = ?').run(id)
  return result.changes > 0
}

export function getWorkspaceStats(workspaceId: string): WorkspaceStats | undefined {
  if (!getWorkspaceById(workspaceId)) return undefined

  const row = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM memberships WHERE workspace_id = @id) AS member_count,
         (SELECT COUNT(*) FROM projects WHERE workspace_id = @id) AS project_count,
         (SELECT COUNT(*) FROM issues i JOIN projects p ON p.id = i.project_id WHERE p.workspace_id = @id) AS issue_count,
         (SELECT COUNT(*) FROM issues i JOIN projects p ON p.id = i.project_id WHERE p.workspace_id = @id AND i.status != 'done') AS open_issue_count`,
    )
    .get({ id: workspaceId }) as {
    member_count: number
    project_count: number
    issue_count: number
    open_issue_count: number
  }

  return {
    memberCount: row.member_count,
    projectCount: row.project_count,
    issueCount: row.issue_count,
    openIssueCount: row.open_issue_count,
  }
}

export function listMemberships(workspaceId: string): Membership[] {
  const rows = db
    .prepare(
      `SELECT id, workspace_id, email, role, created_at
       FROM memberships
       WHERE workspace_id = ?
       ORDER BY
         CASE role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END,
         email ASC`,
    )
    .all(workspaceId) as MembershipRow[]
  return rows.map(mapMembership)
}

export function getMembershipById(workspaceId: string, id: string): Membership | undefined {
  const row = db
    .prepare(
      `SELECT id, workspace_id, email, role, created_at
       FROM memberships WHERE workspace_id = ? AND id = ?`,
    )
    .get(workspaceId, id) as MembershipRow | undefined
  return row ? mapMembership(row) : undefined
}

export function createMembership(
  workspaceId: string,
  input: CreateMembershipInput,
): Membership {
  const membership: Membership = {
    id: crypto.randomUUID(),
    workspaceId,
    email: input.email.trim().toLowerCase(),
    role: input.role ?? 'member',
    createdAt: new Date().toISOString(),
  }

  db.prepare(
    `INSERT INTO memberships (id, workspace_id, email, role, created_at)
     VALUES (@id, @workspaceId, @email, @role, @createdAt)`,
  ).run(membership)

  return membership
}

export function updateMembership(
  workspaceId: string,
  id: string,
  input: UpdateMembershipInput,
): Membership | undefined {
  const existing = getMembershipById(workspaceId, id)
  if (!existing) return undefined

  db.prepare(`UPDATE memberships SET role = ? WHERE workspace_id = ? AND id = ?`).run(
    input.role,
    workspaceId,
    id,
  )

  return getMembershipById(workspaceId, id)
}

export function deleteMembership(workspaceId: string, id: string): boolean {
  const result = db
    .prepare('DELETE FROM memberships WHERE workspace_id = ? AND id = ?')
    .run(workspaceId, id)
  return result.changes > 0
}

export function countOwners(workspaceId: string, excludeId?: string): number {
  const row = excludeId
    ? (db
        .prepare(
          `SELECT COUNT(*) AS total FROM memberships
           WHERE workspace_id = ? AND role = 'owner' AND id != ?`,
        )
        .get(workspaceId, excludeId) as { total: number })
    : (db
        .prepare(
          `SELECT COUNT(*) AS total FROM memberships
           WHERE workspace_id = ? AND role = 'owner'`,
        )
        .get(workspaceId) as { total: number })

  return row.total
}

export function membershipEmailTaken(
  workspaceId: string,
  email: string,
  excludeId?: string,
): boolean {
  const normalized = email.trim().toLowerCase()
  const row = excludeId
    ? db
        .prepare(
          `SELECT id FROM memberships WHERE workspace_id = ? AND email = ? AND id != ?`,
        )
        .get(workspaceId, normalized, excludeId)
    : db
        .prepare(`SELECT id FROM memberships WHERE workspace_id = ? AND email = ?`)
        .get(workspaceId, normalized)
  return Boolean(row)
}

export function listProjects(workspaceId: string): Project[] {
  const rows = db
    .prepare(`${PROJECT_SELECT} WHERE p.workspace_id = ? GROUP BY p.id ORDER BY p.created_at DESC`)
    .all(workspaceId) as ProjectRow[]
  return rows.map(mapProject)
}

export function getProjectById(workspaceId: string, projectId: string): Project | undefined {
  const row = db
    .prepare(`${PROJECT_SELECT} WHERE p.workspace_id = ? AND p.id = ? GROUP BY p.id`)
    .get(workspaceId, projectId) as ProjectRow | undefined
  return row ? mapProject(row) : undefined
}

export function createProject(workspaceId: string, input: CreateProjectInput): Project {
  const now = new Date().toISOString()
  const name = input.name.trim()
  const requested = (input.key?.trim().toUpperCase() || keyFromName(name)).replace(/[^A-Z0-9]/g, '')
  const key = uniqueProjectKey(workspaceId, requested)
  const id = crypto.randomUUID()

  db.prepare(
    `INSERT INTO projects (id, workspace_id, name, key, description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, workspaceId, name, key, input.description?.trim() || null, now, now)

  return getProjectById(workspaceId, id)!
}

export function updateProject(
  workspaceId: string,
  projectId: string,
  input: UpdateProjectInput,
): Project | undefined {
  const existing = getProjectById(workspaceId, projectId)
  if (!existing) return undefined

  const name = input.name !== undefined ? input.name.trim() : existing.name
  const description =
    input.description !== undefined ? input.description?.trim() || null : existing.description

  db.prepare(
    `UPDATE projects SET name = ?, description = ?, updated_at = ? WHERE id = ? AND workspace_id = ?`,
  ).run(name, description, new Date().toISOString(), projectId, workspaceId)

  return getProjectById(workspaceId, projectId)
}

export function deleteProject(workspaceId: string, projectId: string): boolean {
  const result = db
    .prepare('DELETE FROM projects WHERE workspace_id = ? AND id = ?')
    .run(workspaceId, projectId)
  return result.changes > 0
}

export function listIssues(
  workspaceId: string,
  projectId: string,
  filters: IssueFilters = {},
): Issue[] | undefined {
  if (!getProjectById(workspaceId, projectId)) return undefined

  const clauses = ['p.workspace_id = @workspaceId', 'i.project_id = @projectId']
  const params: Record<string, string> = { workspaceId, projectId }

  if (filters.status) {
    clauses.push('i.status = @status')
    params.status = filters.status
  }
  if (filters.priority) {
    clauses.push('i.priority = @priority')
    params.priority = filters.priority
  }
  if (filters.assigneeId === 'unassigned') {
    clauses.push('i.assignee_id IS NULL')
  } else if (filters.assigneeId) {
    clauses.push('i.assignee_id = @assigneeId')
    params.assigneeId = filters.assigneeId
  }
  if (filters.q) {
    clauses.push('(LOWER(i.title) LIKE @q OR LOWER(IFNULL(i.description, \'\')) LIKE @q)')
    params.q = `%${filters.q.toLowerCase()}%`
  }

  const rows = db
    .prepare(
      `${ISSUE_SELECT}
       WHERE ${clauses.join(' AND ')}
       ORDER BY
         CASE i.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
         i.number ASC`,
    )
    .all(params) as IssueRow[]

  return rows.map(mapIssue)
}

export function getIssueById(
  workspaceId: string,
  projectId: string,
  issueId: string,
): Issue | undefined {
  const row = db
    .prepare(
      `${ISSUE_SELECT} WHERE p.workspace_id = ? AND i.project_id = ? AND i.id = ?`,
    )
    .get(workspaceId, projectId, issueId) as IssueRow | undefined
  return row ? mapIssue(row) : undefined
}

export function createIssue(
  workspaceId: string,
  projectId: string,
  input: CreateIssueInput,
): Issue | undefined {
  if (!getProjectById(workspaceId, projectId)) return undefined

  const now = new Date().toISOString()
  const id = crypto.randomUUID()

  const insert = db.transaction(() => {
    const next = db
      .prepare('SELECT COALESCE(MAX(number), 0) + 1 AS n FROM issues WHERE project_id = ?')
      .get(projectId) as { n: number }

    db.prepare(
      `INSERT INTO issues (id, project_id, number, title, description, status, priority, assignee_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      projectId,
      next.n,
      input.title.trim(),
      input.description?.trim() || null,
      input.status ?? 'todo',
      input.priority ?? 'medium',
      input.assigneeId ?? null,
      now,
      now,
    )
  })

  insert()
  return getIssueById(workspaceId, projectId, id)
}

export function updateIssue(
  workspaceId: string,
  projectId: string,
  issueId: string,
  input: UpdateIssueInput,
): Issue | undefined {
  const existing = getIssueById(workspaceId, projectId, issueId)
  if (!existing) return undefined

  const title = input.title !== undefined ? input.title.trim() : existing.title
  const description =
    input.description !== undefined ? input.description?.trim() || null : existing.description
  const status = input.status ?? existing.status
  const priority = input.priority ?? existing.priority
  const assigneeId = input.assigneeId !== undefined ? input.assigneeId : existing.assigneeId

  db.prepare(
    `UPDATE issues
     SET title = ?, description = ?, status = ?, priority = ?, assignee_id = ?, updated_at = ?
     WHERE id = ? AND project_id = ?`,
  ).run(
    title,
    description,
    status,
    priority,
    assigneeId,
    new Date().toISOString(),
    issueId,
    projectId,
  )

  return getIssueById(workspaceId, projectId, issueId)
}

export function deleteIssue(workspaceId: string, projectId: string, issueId: string): boolean {
  if (!getIssueById(workspaceId, projectId, issueId)) return false
  const result = db.prepare('DELETE FROM issues WHERE id = ? AND project_id = ?').run(issueId, projectId)
  return result.changes > 0
}
