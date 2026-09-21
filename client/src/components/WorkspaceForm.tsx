import { useState, type FormEvent } from 'react'
import {
  EMAIL_MAX,
  NAME_MAX,
  hasFieldErrors,
  validateEmail,
  validateWorkspaceName,
  type FieldErrors,
} from '../validation'

type WorkspaceFormProps = {
  onSubmit: (input: { name: string; ownerEmail: string }) => Promise<void>
  disabled?: boolean
}

export function WorkspaceForm({ onSubmit, disabled = false }: WorkspaceFormProps) {
  const [name, setName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled) return
    const nextErrors = {
      name: validateWorkspaceName(name),
      ownerEmail: validateEmail(ownerEmail),
    }
    setErrors(nextErrors)
    if (hasFieldErrors(nextErrors)) return
    try {
      await onSubmit({ name: name.trim(), ownerEmail: ownerEmail.trim() })
      setName('')
      setOwnerEmail('')
      setErrors({})
    } catch {
      // keep the draft so the user can fix it
    }
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit} noValidate>
      <h2>Nuevo workspace</h2>
      <label className={errors.name ? 'has-error' : undefined}>
        Nombre
        <input
          type="text"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Equipo de producto"
          maxLength={NAME_MAX}
          autoComplete="off"
          disabled={disabled}
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </label>
      <label className={errors.ownerEmail ? 'has-error' : undefined}>
        Email del owner
        <input
          type="email"
          name="ownerEmail"
          value={ownerEmail}
          onChange={(event) => setOwnerEmail(event.target.value)}
          placeholder="tu@empresa.com"
          maxLength={EMAIL_MAX}
          disabled={disabled}
          aria-invalid={Boolean(errors.ownerEmail)}
        />
        {errors.ownerEmail && <span className="field-error">{errors.ownerEmail}</span>}
      </label>
      <button type="submit" disabled={disabled}>
        {disabled ? 'Creando…' : 'Crear workspace'}
      </button>
    </form>
  )
}
