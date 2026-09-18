import { useState, type FormEvent } from 'react'

type WorkspaceFormProps = {
  onSubmit: (input: { name: string; ownerEmail: string }) => Promise<void>
  disabled?: boolean
}

export function WorkspaceForm({ onSubmit, disabled = false }: WorkspaceFormProps) {
  const [name, setName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled) return
    try {
      await onSubmit({ name: name.trim(), ownerEmail: ownerEmail.trim() })
      setName('')
      setOwnerEmail('')
    } catch {
      // keep the draft so the user can fix it
    }
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <h2>Nuevo workspace</h2>
      <label>
        Nombre
        <input
          type="text"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Equipo de producto"
          maxLength={80}
          autoComplete="off"
          disabled={disabled}
          required
        />
      </label>
      <label>
        Email del owner
        <input
          type="email"
          name="ownerEmail"
          value={ownerEmail}
          onChange={(event) => setOwnerEmail(event.target.value)}
          placeholder="tu@empresa.com"
          maxLength={160}
          disabled={disabled}
          required
        />
      </label>
      <button type="submit" disabled={disabled}>
        {disabled ? 'Creando…' : 'Crear workspace'}
      </button>
    </form>
  )
}
