import { Router } from 'express'
import {
  countOwners,
  createMembership,
  createWorkspace,
  deleteMembership,
  deleteWorkspace,
  getMembershipById,
  getWorkspaceById,
  getWorkspaceStats,
  listMemberships,
  listWorkspaces,
  membershipEmailTaken,
  updateMembership,
  updateWorkspace,
} from '../db.js'
import { WORKSPACE_ROLES, type WorkspaceRole } from '../types.js'
import projectsRouter from './projects.js'

const router = Router()

const NAME_MAX = 80
const EMAIL_MAX = 160
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isRole(value: unknown): value is WorkspaceRole {
  return typeof value === 'string' && WORKSPACE_ROLES.includes(value as WorkspaceRole)
}

function validateName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Name is required'
  if (trimmed.length > NAME_MAX) return `Name must be at most ${NAME_MAX} characters`
  return null
}

function validateEmail(email: string): string | null {
  const trimmed = email.trim()
  if (!trimmed) return 'Email is required'
  if (trimmed.length > EMAIL_MAX) return `Email must be at most ${EMAIL_MAX} characters`
  if (!EMAIL_RE.test(trimmed)) return 'Email is invalid'
  return null
}

router.get('/', (_req, res) => {
  res.json(listWorkspaces())
})

router.post('/', (req, res) => {
  const { name, ownerEmail } = req.body ?? {}

  if (typeof name !== 'string') {
    res.status(400).json({ error: 'Name is required' })
    return
  }
  const nameError = validateName(name)
  if (nameError) {
    res.status(400).json({ error: nameError })
    return
  }
  if (typeof ownerEmail !== 'string') {
    res.status(400).json({ error: 'Owner email is required' })
    return
  }
  const emailError = validateEmail(ownerEmail)
  if (emailError) {
    res.status(400).json({ error: emailError })
    return
  }

  const workspace = createWorkspace({ name, ownerEmail })
  res.status(201).json(workspace)
})

router.get('/:id/stats', (req, res) => {
  const stats = getWorkspaceStats(req.params.id)
  if (!stats) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }
  res.json(stats)
})

router.get('/:id', (req, res) => {
  const workspace = getWorkspaceById(req.params.id)
  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }
  res.json(workspace)
})

router.patch('/:id', (req, res) => {
  const { name } = req.body ?? {}

  if (name !== undefined) {
    if (typeof name !== 'string') {
      res.status(400).json({ error: 'Name cannot be empty' })
      return
    }
    const nameError = validateName(name)
    if (nameError) {
      res.status(400).json({
        error: nameError === 'Name is required' ? 'Name cannot be empty' : nameError,
      })
      return
    }
  }

  const workspace = updateWorkspace(req.params.id, { name })
  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }
  res.json(workspace)
})

router.delete('/:id', (req, res) => {
  const deleted = deleteWorkspace(req.params.id)
  if (!deleted) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }
  res.status(204).send()
})

router.get('/:id/members', (req, res) => {
  if (!getWorkspaceById(req.params.id)) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }
  res.json(listMemberships(req.params.id))
})

router.post('/:id/members', (req, res) => {
  const workspaceId = req.params.id
  if (!getWorkspaceById(workspaceId)) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }

  const { email, role } = req.body ?? {}
  if (typeof email !== 'string') {
    res.status(400).json({ error: 'Email is required' })
    return
  }
  const emailError = validateEmail(email)
  if (emailError) {
    res.status(400).json({ error: emailError })
    return
  }
  if (role !== undefined && !isRole(role)) {
    res.status(400).json({ error: 'Invalid role' })
    return
  }
  if (membershipEmailTaken(workspaceId, email)) {
    res.status(409).json({ error: 'Email already belongs to this workspace' })
    return
  }

  const member = createMembership(workspaceId, { email, role })
  res.status(201).json(member)
})

router.patch('/:id/members/:memberId', (req, res) => {
  const { id: workspaceId, memberId } = req.params
  const existing = getMembershipById(workspaceId, memberId)
  if (!existing) {
    res.status(404).json({ error: 'Member not found' })
    return
  }

  const { role } = req.body ?? {}
  if (!isRole(role)) {
    res.status(400).json({ error: 'Invalid role' })
    return
  }
  if (existing.role === 'owner' && role !== 'owner' && countOwners(workspaceId, memberId) < 1) {
    res.status(409).json({ error: 'Workspace must keep at least one owner' })
    return
  }

  const member = updateMembership(workspaceId, memberId, { role })
  res.json(member)
})

router.delete('/:id/members/:memberId', (req, res) => {
  const { id: workspaceId, memberId } = req.params
  const existing = getMembershipById(workspaceId, memberId)
  if (!existing) {
    res.status(404).json({ error: 'Member not found' })
    return
  }
  if (existing.role === 'owner' && countOwners(workspaceId, memberId) < 1) {
    res.status(409).json({ error: 'Workspace must keep at least one owner' })
    return
  }

  deleteMembership(workspaceId, memberId)
  res.status(204).send()
})

router.use('/:id/projects', projectsRouter)

export default router
