import { useState, useEffect } from 'react'
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type Issue,
  type IssuePriority,
  type IssueStatus,
  type Membership,
} from '../types'
import { DESCRIPTION_MAX, TITLE_MAX, validateDescription, validateTitle } from '../validation'

type IssueDetailProps = {
  issue: Issue
  members: Membership[]
  busy?: boolean
  onClose: () => void
  onSave: (input: {
    title: string
    description: string
    status: IssueStatus
    priority: IssuePriority
    assigneeId: string | null
  }) => Promise<void>
  onDelete: () => Promise<void>
}

export function IssueDetail({
  issue,
  members,
  busy = false,
  onClose,
  onSave,
  onDelete,
}: IssueDetailProps) {
  const [title, setTitle] = useState(issue.title)
  const [description, setDescription] = useState(issue.description ?? '')
  const [status, setStatus] = useState(issue.status)
  const [priority, setPriority] = useState(issue.priority)
  const [assigneeId, setAssigneeId] = useState(issue.assigneeId ?? '')
  const [titleError, setTitleError] = useState<string | undefined>()
  const [descriptionError, setDescriptionError] = useState<string | undefined>()

  useEffect(() => {
    setTitle(issue.title)
    setDescription(issue.description ?? '')
    setStatus(issue.status)
    setPriority(issue.priority)
    setAssigneeId(issue.assigneeId ?? '')
    setTitleError(undefined)
    setDescriptionError(undefined)
  }, [issue])

  async function handleSave() {
    const nextTitleError = validateTitle(title)
    const nextDescriptionError = validateDescription(description)
    setTitleError(nextTitleError)
    setDescriptionError(nextDescriptionError)
    if (nextTitleError || nextDescriptionError) return
    await onSave({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assigneeId: assigneeId || null,
    })
  }

  return (
    <div className="drawer-backdrop" onClick={onClose} role="presentation">
      <aside
        className="drawer"
        role="dialog"
        aria-labelledby="issue-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="drawer-header">
          <p className="eyebrow">{issue.key}</p>
          <button type="button" className="linkish" onClick={onClose}>
            Cerrar
          </button>
        </header>

        <label className={titleError ? 'has-error' : undefined}>
          Título
          <input
            id="issue-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={TITLE_MAX}
            disabled={busy}
          />
          {titleError && <span className="field-error">{titleError}</span>}
        </label>

        <label className={descriptionError ? 'has-error' : undefined}>
          Descripción
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={5}
            maxLength={DESCRIPTION_MAX}
            disabled={busy}
          />
          {descriptionError && <span className="field-error">{descriptionError}</span>}
        </label>

        <div className="form-row">
          <label>
            Estado
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as IssueStatus)}
              disabled={busy}
            >
              {ISSUE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prioridad
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as IssuePriority)}
              disabled={busy}
            >
              {ISSUE_PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {PRIORITY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Asignado
          <select
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
            disabled={busy}
          >
            <option value="">Sin asignar</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.email}
              </option>
            ))}
          </select>
        </label>

        <div className="drawer-actions">
          <button type="button" onClick={handleSave} disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
          <button type="button" className="danger" onClick={onDelete} disabled={busy}>
            Eliminar
          </button>
        </div>
      </aside>
    </div>
  )
}
