import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  createIssue,
  deleteIssue,
  fetchIssues,
  fetchMembers,
  fetchProjects,
  updateIssue,
} from '../api'
import { IssueDetail } from '../components/IssueDetail'
import { IssueForm } from '../components/IssueForm'
import { useMesa } from '../context/MesaContext'
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type Issue,
  type IssueFilters,
  type IssuePriority,
  type IssueStatus,
  type Membership,
  type Project,
} from '../types'

function storageKey(workspaceId: string) {
  return `mesa.project.${workspaceId}`
}

export function BoardPage() {
  const { workspaceId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { busy, setBusy, setNotice } = useMesa()
  const [projects, setProjects] = useState<Project[]>([])
  const [members, setMembers] = useState<Membership[]>([])
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [filters, setFilters] = useState<IssueFilters>({})
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const projectId =
    searchParams.get('project') ||
    (typeof window !== 'undefined' ? localStorage.getItem(storageKey(workspaceId)) : null) ||
    ''

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchProjects(workspaceId), fetchMembers(workspaceId)])
      .then(([projectList, memberList]) => {
        if (cancelled) return
        setProjects(projectList)
        setMembers(memberList)
        const stored = localStorage.getItem(storageKey(workspaceId))
        const fromQuery = searchParams.get('project')
        const next =
          (fromQuery && projectList.some((project) => project.id === fromQuery) && fromQuery) ||
          (stored && projectList.some((project) => project.id === stored) && stored) ||
          projectList[0]?.id
        if (next && fromQuery !== next) {
          setSearchParams({ project: next }, { replace: true })
        }
        if (next) localStorage.setItem(storageKey(workspaceId), next)
      })
      .catch((err: Error) => {
        if (!cancelled) setNotice({ type: 'error', message: err.message })
      })
    return () => {
      cancelled = true
    }
  }, [workspaceId, setNotice, setSearchParams])

  useEffect(() => {
    if (!projectId) {
      setIssues([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    fetchIssues(workspaceId, projectId, {
      priority: filters.priority,
      assignee: filters.assignee,
    })
      .then((data) => {
        if (!cancelled) setIssues(data)
      })
      .catch((err: Error) => {
        if (!cancelled) setNotice({ type: 'error', message: err.message })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [workspaceId, projectId, filters.priority, filters.assignee, setNotice])

  const selectedProject = projects.find((project) => project.id === projectId)

  const visibleIssues = useMemo(() => {
    const q = filters.q?.trim().toLowerCase()
    if (!q) return issues
    return issues.filter((issue) => {
      const haystack = `${issue.title} ${issue.description ?? ''} ${issue.key}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [issues, filters.q])

  const columns = useMemo(
    () =>
      ISSUE_STATUSES.map((status) => ({
        status,
        issues: visibleIssues.filter((issue) => issue.status === status),
      })),
    [visibleIssues],
  )

  async function handleCreate(input: {
    title: string
    description?: string
    status: IssueStatus
    priority: IssuePriority
    assigneeId: string | null
  }) {
    if (!projectId) return
    setBusy(true)
    setNotice(null)
    try {
      const issue = await createIssue(workspaceId, projectId, input)
      setIssues((current) => [...current, issue])
      setNotice({ type: 'success', message: `${issue.key} creado.` })
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al crear el issue',
      })
      throw err
    } finally {
      setBusy(false)
    }
  }

  async function handleStatus(issue: Issue, status: IssueStatus) {
    setBusy(true)
    setNotice(null)
    try {
      const updated = await updateIssue(workspaceId, issue.projectId, issue.id, { status })
      setIssues((current) => current.map((item) => (item.id === issue.id ? updated : item)))
      setSelectedIssue((current) => (current?.id === issue.id ? updated : current))
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al mover el issue',
      })
    } finally {
      setBusy(false)
    }
  }

  async function handleSave(input: {
    title: string
    description: string
    status: IssueStatus
    priority: IssuePriority
    assigneeId: string | null
  }) {
    if (!selectedIssue) return
    setBusy(true)
    setNotice(null)
    try {
      const updated = await updateIssue(workspaceId, selectedIssue.projectId, selectedIssue.id, input)
      setIssues((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setSelectedIssue(updated)
      setNotice({ type: 'success', message: `${updated.key} actualizado.` })
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al guardar el issue',
      })
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!selectedIssue) return
    setBusy(true)
    setNotice(null)
    try {
      await deleteIssue(workspaceId, selectedIssue.projectId, selectedIssue.id)
      setIssues((current) => current.filter((item) => item.id !== selectedIssue.id))
      setNotice({ type: 'success', message: `${selectedIssue.key} eliminado.` })
      setSelectedIssue(null)
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al eliminar el issue',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <header className="app-header">
        <p className="eyebrow">Tablero</p>
        <h1>{selectedProject ? selectedProject.name : 'Issues'}</h1>
        <p className="lede">
          Arrastra tarjetas entre columnas o ábrela para editar, asignar y filtrar.
        </p>
      </header>

      {projects.length === 0 ? (
        <p className="muted">Crea un proyecto antes de usar el tablero.</p>
      ) : (
        <>
          <div className="filters">
            <label>
              Proyecto
              <select
                value={projectId}
                onChange={(event) => {
                  const next = event.target.value
                  localStorage.setItem(storageKey(workspaceId), next)
                  setSearchParams({ project: next })
                  setSelectedIssue(null)
                }}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.key} · {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Prioridad
              <select
                value={filters.priority ?? ''}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    priority: (event.target.value || undefined) as IssuePriority | undefined,
                  }))
                }
              >
                <option value="">Todas</option>
                {ISSUE_PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {PRIORITY_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Asignado
              <select
                value={filters.assignee ?? ''}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    assignee: event.target.value || undefined,
                  }))
                }
              >
                <option value="">Todos</option>
                <option value="unassigned">Sin asignar</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.email}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Buscar
              <input
                type="search"
                value={filters.q ?? ''}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    q: event.target.value.trim() ? event.target.value : undefined,
                  }))
                }
                placeholder="Título o descripción"
              />
            </label>
          </div>

          <IssueForm members={members} onSubmit={handleCreate} disabled={busy || !projectId} />

          {loading ? (
            <p className="muted">Cargando tablero…</p>
          ) : (
            <div className="board" role="list">
              {columns.map((column) => (
                <section
                  key={column.status}
                  className="board-column"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    const id = event.dataTransfer.getData('text/plain') || draggingId
                    const issue = issues.find((item) => item.id === id)
                    if (issue && issue.status !== column.status) {
                      void handleStatus(issue, column.status)
                    }
                    setDraggingId(null)
                  }}
                >
                  <header>
                    <h2>{STATUS_LABELS[column.status]}</h2>
                    <span className="count">{column.issues.length}</span>
                  </header>
                  {column.issues.length === 0 ? (
                    <p className="muted">Vacío</p>
                  ) : (
                    column.issues.map((issue) => (
                      <button
                        key={issue.id}
                        type="button"
                        className={`issue-card priority-${issue.priority}`}
                        draggable
                        onDragStart={(event) => {
                          setDraggingId(issue.id)
                          event.dataTransfer.setData('text/plain', issue.id)
                          event.dataTransfer.effectAllowed = 'move'
                        }}
                        onDragEnd={() => setDraggingId(null)}
                        onClick={() => setSelectedIssue(issue)}
                      >
                        <span className="issue-key">{issue.key}</span>
                        <strong>{issue.title}</strong>
                        <small>
                          {PRIORITY_LABELS[issue.priority]}
                          {issue.assigneeEmail ? ` · ${issue.assigneeEmail}` : ' · Sin asignar'}
                        </small>
                      </button>
                    ))
                  )}
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {selectedIssue && (
        <IssueDetail
          issue={selectedIssue}
          members={members}
          busy={busy}
          onClose={() => setSelectedIssue(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </>
  )
}
