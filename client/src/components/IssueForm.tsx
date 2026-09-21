import { useState, type FormEvent } from 'react'
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type IssuePriority,
  type IssueStatus,
  type Membership,
} from '../types'
import {
  DESCRIPTION_MAX,
  TITLE_MAX,
  hasFieldErrors,
  validateDescription,
  validateTitle,
  type FieldErrors,
} from '../validation'

type IssueFormProps = {
  members: Membership[]
  onSubmit: (input: {
    title: string
    description?: string
    status: IssueStatus
    priority: IssuePriority
    assigneeId: string | null
  }) => Promise<void>
  disabled?: boolean
}

export function IssueForm({ members, onSubmit, disabled = false }: IssueFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<IssueStatus>('todo')
  const [priority, setPriority] = useState<IssuePriority>('medium')
  const [assigneeId, setAssigneeId] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled || submitting) return
    const nextErrors = {
      title: validateTitle(title),
      description: validateDescription(description),
    }
    setErrors(nextErrors)
    if (hasFieldErrors(nextErrors)) return
    setSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        assigneeId: assigneeId || null,
      })
      setTitle('')
      setDescription('')
      setStatus('todo')
      setPriority('medium')
      setAssigneeId('')
      setErrors({})
    } catch {
      // keep the draft
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit} noValidate>
      <h2>Nuevo issue</h2>
      <label className={errors.title ? 'has-error' : undefined}>
        Título
        <input
          type="text"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Qué hay que hacer"
          maxLength={TITLE_MAX}
          disabled={disabled || submitting}
        />
        {errors.title && <span className="field-error">{errors.title}</span>}
      </label>
      <label className={errors.description ? 'has-error' : undefined}>
        Descripción
        <textarea
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          maxLength={DESCRIPTION_MAX}
          disabled={disabled}
        />
        {errors.description && <span className="field-error">{errors.description}</span>}
      </label>
      <div className="form-row">
        <label>
          Estado
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as IssueStatus)}
            disabled={disabled}
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
            disabled={disabled}
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
        Asignar a
        <select
          value={assigneeId}
          onChange={(event) => setAssigneeId(event.target.value)}
          disabled={disabled}
        >
          <option value="">Sin asignar</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.email}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={disabled || submitting}>
        {submitting ? 'Creando…' : 'Crear issue'}
      </button>
    </form>
  )
}
