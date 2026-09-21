import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { createMember, deleteMember, fetchMembers, updateMember } from '../api'
import { MemberForm } from '../components/MemberForm'
import { useMesa } from '../context/MesaContext'
import { ROLE_LABELS, WORKSPACE_ROLES, type Membership, type WorkspaceRole } from '../types'

export function TeamPage() {
  const { workspaceId = '' } = useParams()
  const { setWorkspaces, busy, setBusy, setNotice } = useMesa()
  const [members, setMembers] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchMembers(workspaceId)
      .then((data) => {
        if (!cancelled) setMembers(data)
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
  }, [workspaceId, setNotice])

  async function handleCreate(input: { email: string; role: WorkspaceRole }) {
    setBusy(true)
    setNotice(null)
    try {
      const member = await createMember(workspaceId, input)
      setMembers((current) => [...current, member])
      setWorkspaces((current) =>
        current.map((workspace) =>
          workspace.id === workspaceId
            ? { ...workspace, memberCount: workspace.memberCount + 1 }
            : workspace,
        ),
      )
      setNotice({ type: 'success', message: 'Miembro agregado.' })
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al agregar el miembro',
      })
      throw err
    } finally {
      setBusy(false)
    }
  }

  async function handleRole(memberId: string, role: WorkspaceRole) {
    setBusy(true)
    setNotice(null)
    try {
      const member = await updateMember(workspaceId, memberId, role)
      setMembers((current) => current.map((item) => (item.id === memberId ? member : item)))
      setNotice({ type: 'success', message: 'Rol actualizado.' })
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al cambiar el rol',
      })
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(memberId: string) {
    setBusy(true)
    setNotice(null)
    try {
      await deleteMember(workspaceId, memberId)
      setMembers((current) => current.filter((member) => member.id !== memberId))
      setWorkspaces((current) =>
        current.map((workspace) =>
          workspace.id === workspaceId
            ? { ...workspace, memberCount: Math.max(0, workspace.memberCount - 1) }
            : workspace,
        ),
      )
      setNotice({ type: 'success', message: 'Miembro eliminado.' })
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al quitar el miembro',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <header className="app-header">
        <p className="eyebrow">Equipo</p>
        <h1>Miembros</h1>
        <p className="lede">Invita gente al workspace y asígnales un rol. Debe quedar al menos un owner.</p>
      </header>

      <MemberForm onSubmit={handleCreate} disabled={busy} />

      <section className="panel">
        <div className="panel-header">
          <h2>Equipo</h2>
          <span className="count">{loading ? '…' : members.length}</span>
        </div>
        {loading ? (
          <p className="muted">Cargando…</p>
        ) : members.length === 0 ? (
          <p className="muted">Sin miembros.</p>
        ) : (
          <ul className="card-list">
            {members.map((member) => (
              <li key={member.id}>
                <div className="card static">
                  <strong>{member.email}</strong>
                  <label className="inline-label">
                    Rol
                    <select
                      value={member.role}
                      disabled={busy}
                      onChange={(event) =>
                        handleRole(member.id, event.target.value as WorkspaceRole)
                      }
                    >
                      {WORKSPACE_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  className="linkish"
                  disabled={busy}
                  onClick={() => handleDelete(member.id)}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
