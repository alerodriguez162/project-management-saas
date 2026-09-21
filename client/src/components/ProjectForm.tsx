import { useState, type FormEvent } from 'react'
import {
  DESCRIPTION_MAX,
  KEY_MAX,
  NAME_MAX,
  hasFieldErrors,
  validateDescription,
  validateProjectKey,
  validateWorkspaceName,
  type FieldErrors,
} from '../validation'

type ProjectFormProps = {
  onSubmit: (input: { name: string; key?: string; description?: string }) => Promise<void>
  disabled?: boolean
}

export function ProjectForm({ onSubmit, disabled = false }: ProjectFormProps) {
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled) return
    const nextErrors = {
      name: validateWorkspaceName(name),
      key: validateProjectKey(key),
      description: validateDescription(description),
    }
    setErrors(nextErrors)
    if (hasFieldErrors(nextErrors)) return
    try {
      await onSubmit({
        name: name.trim(),
        key: key.trim().toUpperCase() || undefined,
        description: description.trim() || undefined,
      })
      setName('')
      setKey('')
      setDescription('')
      setErrors({})
    } catch {
      // keep the draft
    }
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit} noValidate>
      <h2>Nuevo proyecto</h2>
      <label className={errors.name ? 'has-error' : undefined}>
        Nombre
        <input
          type="text"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="App móvil"
          maxLength={NAME_MAX}
          disabled={disabled}
        />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </label>
      <label className={errors.key ? 'has-error' : undefined}>
        Clave (opcional)
        <input
          type="text"
          name="key"
          value={key}
          onChange={(event) => setKey(event.target.value.toUpperCase())}
          placeholder="MOB"
          maxLength={KEY_MAX}
          disabled={disabled}
        />
        {errors.key ? (
          <span className="field-error">{errors.key}</span>
        ) : (
          <span className="field-hint">Si la dejas vacía, Mesa la genera.</span>
        )}
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
      <button type="submit" disabled={disabled}>
        {disabled ? 'Creando…' : 'Crear proyecto'}
      </button>
    </form>
  )
}
