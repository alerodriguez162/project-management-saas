import { Router } from 'express'
import {
  createIssue,
  createProject,
  deleteIssue,
  deleteProject,
  getIssueById,
  getMembershipById,
  getProjectById,
  getWorkspaceById,
  listIssues,
  listProjects,
  updateIssue,
  updateProject,
} from '../db.js'
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  type IssuePriority,
  type IssueStatus,
} from '../types.js'

const router = Router({ mergeParams: true })

const NAME_MAX = 80
const TITLE_MAX = 120
const DESCRIPTION_MAX = 2000
const KEY_RE = /^[A-Z][A-Z0-9]{1,5}$/

function workspaceId(req: { params: Record<string, string | undefined> }): string {
  return req.params.workspaceId ?? req.params.id ?? ''
}

function isStatus(value: unknown): value is IssueStatus {
  return typeof value === 'string' && ISSUE_STATUSES.includes(value as IssueStatus)
}

function isPriority(value: unknown): value is IssuePriority {
  return typeof value === 'string' && ISSUE_PRIORITIES.includes(value as IssuePriority)
}

function validateName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Name is required'
  if (trimmed.length > NAME_MAX) return `Name must be at most ${NAME_MAX} characters`
  return null
}

function validateTitle(title: string): string | null {
  const trimmed = title.trim()
  if (!trimmed) return 'Title is required'
  if (trimmed.length > TITLE_MAX) return `Title must be at most ${TITLE_MAX} characters`
  return null
}

function validateDescription(description: unknown): string | null {
  if (description === undefined || description === null) return null
  if (typeof description !== 'string') return 'Description must be a string or null'
  if (description.length > DESCRIPTION_MAX) {
    return `Description must be at most ${DESCRIPTION_MAX} characters`
  }
  return null
}

function validateKey(key: string): string | null {
  const normalized = key.trim().toUpperCase()
  if (!KEY_RE.test(normalized)) return 'Key must be 2-6 letters or digits, starting with a letter'
  return null
}

function requireWorkspace(req: { params: Record<string, string | undefined> }) {
  const id = workspaceId(req)
  return getWorkspaceById(id) ? id : null
}

router.get('/', (req, res) => {
  const id = requireWorkspace(req)
  if (!id) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }
  res.json(listProjects(id))
})

router.post('/', (req, res) => {
  const id = requireWorkspace(req)
  if (!id) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }

  const { name, key, description } = req.body ?? {}
  if (typeof name !== 'string') {
    res.status(400).json({ error: 'Name is required' })
    return
  }
  const nameError = validateName(name)
  if (nameError) {
    res.status(400).json({ error: nameError })
    return
  }
  if (key !== undefined) {
    if (typeof key !== 'string') {
      res.status(400).json({ error: 'Key must be a string' })
      return
    }
    const keyError = validateKey(key)
    if (keyError) {
      res.status(400).json({ error: keyError })
      return
    }
  }
  const descriptionError = validateDescription(description)
  if (descriptionError) {
    res.status(400).json({ error: descriptionError })
    return
  }

  const project = createProject(id, {
    name,
    key: typeof key === 'string' ? key.toUpperCase() : undefined,
    description,
  })
  res.status(201).json(project)
})

router.get('/:projectId', (req, res) => {
  const id = requireWorkspace(req)
  if (!id) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }
  const project = getProjectById(id, req.params.projectId)
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  res.json(project)
})

router.patch('/:projectId', (req, res) => {
  const id = requireWorkspace(req)
  if (!id) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }

  const { name, description } = req.body ?? {}
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
  const descriptionError = validateDescription(description)
  if (descriptionError) {
    res.status(400).json({ error: descriptionError })
    return
  }

  const project = updateProject(id, req.params.projectId, { name, description })
  if (!project) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  res.json(project)
})

router.delete('/:projectId', (req, res) => {
  const id = requireWorkspace(req)
  if (!id) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }
  const deleted = deleteProject(id, req.params.projectId)
  if (!deleted) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  res.status(204).send()
})

router.get('/:projectId/issues', (req, res) => {
  const id = requireWorkspace(req)
  if (!id) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }

  const { status, priority, assignee, q } = req.query
  if (status !== undefined && !isStatus(status)) {
    res.status(400).json({ error: 'Invalid status filter' })
    return
  }
  if (priority !== undefined && !isPriority(priority)) {
    res.status(400).json({ error: 'Invalid priority filter' })
    return
  }
  if (assignee !== undefined && typeof assignee !== 'string') {
    res.status(400).json({ error: 'Invalid assignee filter' })
    return
  }
  if (q !== undefined && typeof q !== 'string') {
    res.status(400).json({ error: 'Invalid search' })
    return
  }

  const issues = listIssues(id, req.params.projectId, {
    status: status as IssueStatus | undefined,
    priority: priority as IssuePriority | undefined,
    assigneeId: assignee as string | undefined,
    q: q?.trim() || undefined,
  })
  if (!issues) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  res.json(issues)
})

router.post('/:projectId/issues', (req, res) => {
  const id = requireWorkspace(req)
  if (!id) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }

  const { title, description, status, priority, assigneeId } = req.body ?? {}
  if (typeof title !== 'string') {
    res.status(400).json({ error: 'Title is required' })
    return
  }
  const titleError = validateTitle(title)
  if (titleError) {
    res.status(400).json({ error: titleError })
    return
  }
  const descriptionError = validateDescription(description)
  if (descriptionError) {
    res.status(400).json({ error: descriptionError })
    return
  }
  if (status !== undefined && !isStatus(status)) {
    res.status(400).json({ error: 'Invalid status' })
    return
  }
  if (priority !== undefined && !isPriority(priority)) {
    res.status(400).json({ error: 'Invalid priority' })
    return
  }
  if (assigneeId !== undefined && assigneeId !== null) {
    if (typeof assigneeId !== 'string' || !getMembershipById(id, assigneeId)) {
      res.status(400).json({ error: 'Assignee must belong to this workspace' })
      return
    }
  }

  const issue = createIssue(id, req.params.projectId, {
    title,
    description,
    status,
    priority,
    assigneeId: assigneeId ?? null,
  })
  if (!issue) {
    res.status(404).json({ error: 'Project not found' })
    return
  }
  res.status(201).json(issue)
})

router.get('/:projectId/issues/:issueId', (req, res) => {
  const id = requireWorkspace(req)
  if (!id) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }
  const issue = getIssueById(id, req.params.projectId, req.params.issueId)
  if (!issue) {
    res.status(404).json({ error: 'Issue not found' })
    return
  }
  res.json(issue)
})

router.patch('/:projectId/issues/:issueId', (req, res) => {
  const id = requireWorkspace(req)
  if (!id) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }

  const { title, description, status, priority, assigneeId } = req.body ?? {}
  if (title !== undefined) {
    if (typeof title !== 'string') {
      res.status(400).json({ error: 'Title cannot be empty' })
      return
    }
    const titleError = validateTitle(title)
    if (titleError) {
      res.status(400).json({
        error: titleError === 'Title is required' ? 'Title cannot be empty' : titleError,
      })
      return
    }
  }
  const descriptionError = validateDescription(description)
  if (descriptionError) {
    res.status(400).json({ error: descriptionError })
    return
  }
  if (status !== undefined && !isStatus(status)) {
    res.status(400).json({ error: 'Invalid status' })
    return
  }
  if (priority !== undefined && !isPriority(priority)) {
    res.status(400).json({ error: 'Invalid priority' })
    return
  }
  if (assigneeId !== undefined && assigneeId !== null) {
    if (typeof assigneeId !== 'string' || !getMembershipById(id, assigneeId)) {
      res.status(400).json({ error: 'Assignee must belong to this workspace' })
      return
    }
  }

  const issue = updateIssue(id, req.params.projectId, req.params.issueId, {
    title,
    description,
    status,
    priority,
    assigneeId,
  })
  if (!issue) {
    res.status(404).json({ error: 'Issue not found' })
    return
  }
  res.json(issue)
})

router.delete('/:projectId/issues/:issueId', (req, res) => {
  const id = requireWorkspace(req)
  if (!id) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }
  const deleted = deleteIssue(id, req.params.projectId, req.params.issueId)
  if (!deleted) {
    res.status(404).json({ error: 'Issue not found' })
    return
  }
  res.status(204).send()
})

export default router
