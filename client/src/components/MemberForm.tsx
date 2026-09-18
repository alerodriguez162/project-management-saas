import { useState, type FormEvent } from 'react'
import { ROLE_LABELS, WORKSPACE_ROLES, type WorkspaceRole } from '../types'

type MemberFormProps = {
  onSubmit: (input: { email: string; role: WorkspaceRole }) => Promise<void>
  disabled?: boolean
}

export function MemberForm({ onSubmit, disabled = false }: MemberFormProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<WorkspaceRole>('member')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled) return
    try {
      await onSubmit({ email: email.trim(), role })
      setEmail('')
      setRole('member')
    } catch {
      // keep the draft so the user can fix it
    }
  }

  return (
    <form className="stack-form" onSubmit={handleSubmit}>
      <h2>Invitar miembro</h2>
      <label>
        Email
        <input
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="persona@empresa.com"
          maxLength={160}
          disabled={disabled}
          required
        />
      </label>
      <label>
        Rol
        <select
          name="role"
          value={role}
          onChange={(event) => setRole(event.target.value as WorkspaceRole)}
          disabled={disabled}
        >
          {WORKSPACE_ROLES.map((value) => (
            <option key={value} value={value}>
              {ROLE_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={disabled}>
        {disabled ? 'Agregando…' : 'Agregar miembro'}
      </button>
    </form>
  )
}
