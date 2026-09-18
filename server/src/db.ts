import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  CreateMembershipInput,
  CreateWorkspaceInput,
  Membership,
  UpdateMembershipInput,
  UpdateWorkspaceInput,
  Workspace,
  WorkspaceRole,
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

  CREATE INDEX IF NOT EXISTS idx_memberships_workspace ON memberships(workspace_id);
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

const WORKSPACE_SELECT = `
  SELECT w.id, w.name, w.slug, w.created_at, w.updated_at,
         COUNT(m.id) AS member_count
  FROM workspaces w
  LEFT JOIN memberships m ON m.workspace_id = w.id
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
