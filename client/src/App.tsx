import { useEffect, useState } from 'react'
import {
  createMember,
  createWorkspace,
  deleteMember,
  deleteWorkspace,
  fetchHealth,
  fetchMembers,
  fetchWorkspaces,
} from './api'
import { MemberForm } from './components/MemberForm'
import { WorkspaceForm } from './components/WorkspaceForm'
import { ROLE_LABELS, type Membership, type NavItem, type Workspace } from './types'
import './App.css'

const NAV: NavItem[] = [
  { id: 'overview', label: 'Resumen', hint: 'Workspaces y estado' },
  { id: 'projects', label: 'Proyectos', hint: 'Próximo: listado y claves' },
  { id: 'board', label: 'Tablero', hint: 'Próximo: issues y columnas' },
  { id: 'team', label: 'Equipo', hint: 'Miembros y roles' },
]

type Notice = {
  type: 'error' | 'success'
  message: string
}

export default function App() {
  const [active, setActive] = useState('overview')
  const [healthOk, setHealthOk] = useState<boolean | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [members, setMembers] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const selected = workspaces.find((workspace) => workspace.id === selectedId) ?? null

  useEffect(() => {
    let cancelled = false

    Promise.all([fetchHealth(), fetchWorkspaces()])
      .then(([health, data]) => {
        if (cancelled) return
        setHealthOk(health.status === 'ok')
        setWorkspaces(data)
        setSelectedId((current) => current ?? data[0]?.id ?? null)
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setHealthOk(false)
          setNotice({ type: 'error', message: err.message })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setMembers([])
      return
    }

    let cancelled = false
    fetchMembers(selectedId)
      .then((data) => {
        if (!cancelled) setMembers(data)
      })
      .catch((err: Error) => {
        if (!cancelled) setNotice({ type: 'error', message: err.message })
      })

    return () => {
      cancelled = true
    }
  }, [selectedId])

  async function handleCreateWorkspace(input: { name: string; ownerEmail: string }) {
    setBusy(true)
    setNotice(null)
    try {
      const workspace = await createWorkspace(input)
      setWorkspaces((current) => [workspace, ...current])
      setSelectedId(workspace.id)
      setNotice({ type: 'success', message: 'Workspace creado.' })
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al crear el workspace',
      })
      throw err
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteWorkspace(id: string) {
    setBusy(true)
    setNotice(null)
    try {
      await deleteWorkspace(id)
      setWorkspaces((current) => current.filter((workspace) => workspace.id !== id))
      setSelectedId((current) => {
        if (current !== id) return current
        const remaining = workspaces.filter((workspace) => workspace.id !== id)
        return remaining[0]?.id ?? null
      })
      setNotice({ type: 'success', message: 'Workspace eliminado.' })
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al eliminar el workspace',
      })
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateMember(input: { email: string; role: Membership['role'] }) {
    if (!selectedId) return
    setBusy(true)
    setNotice(null)
    try {
      const member = await createMember(selectedId, input)
      setMembers((current) => [...current, member])
      setWorkspaces((current) =>
        current.map((workspace) =>
          workspace.id === selectedId
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

  async function handleDeleteMember(memberId: string) {
    if (!selectedId) return
    setBusy(true)
    setNotice(null)
    try {
      await deleteMember(selectedId, memberId)
      setMembers((current) => current.filter((member) => member.id !== memberId))
      setWorkspaces((current) =>
        current.map((workspace) =>
          workspace.id === selectedId
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
    <div className="shell">
      <aside className="sidebar">
        <p className="brand">Mesa</p>
        <p className="brand-sub">Project Management</p>
        <nav aria-label="Módulos">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === active ? 'nav-item is-active' : 'nav-item'}
              onClick={() => setActive(item.id)}
            >
              <span>{item.label}</span>
              <small>{item.hint}</small>
            </button>
          ))}
        </nav>
      </aside>

      <main className="app">
        <header className="app-header">
          <p className="eyebrow">Apex Bench · Day 2</p>
          <h1>Workspaces</h1>
          <p className="lede">
            Persistencia SQLite, CRUD de workspaces y miembros. Proyectos y
            tablero siguen para los próximos días.
          </p>
        </header>

        {notice && (
          <div className={`banner ${notice.type}`} role="status">
            <p>{notice.message}</p>
            <button type="button" className="linkish" onClick={() => setNotice(null)}>
              Cerrar
            </button>
          </div>
        )}

        {active === 'overview' && (
          <>
            <section className="panel">
              <h2>API</h2>
              <p className={healthOk ? 'muted' : 'banner error'}>
                {healthOk === null
                  ? 'Comprobando `/api/health`…'
                  : healthOk
                    ? 'API en línea. Los workspaces se guardan en SQLite.'
                    : 'No hay conexión con la API. Arranca el server en el puerto 3001.'}
              </p>
            </section>

            <WorkspaceForm onSubmit={handleCreateWorkspace} disabled={busy} />

            <section className="panel">
              <div className="panel-header">
                <h2>Workspaces</h2>
                <span className="count">{loading ? '…' : workspaces.length}</span>
              </div>
              {loading ? (
                <p className="muted">Cargando…</p>
              ) : workspaces.length === 0 ? (
                <p className="muted">No hay workspaces todavía. Crea el primero arriba.</p>
              ) : (
                <ul className="card-list">
                  {workspaces.map((workspace) => (
                    <li key={workspace.id}>
                      <button
                        type="button"
                        className={
                          workspace.id === selectedId ? 'card is-active' : 'card'
                        }
                        onClick={() => {
                          setSelectedId(workspace.id)
                          setActive('team')
                        }}
                      >
                        <strong>{workspace.name}</strong>
                        <span>/{workspace.slug}</span>
                        <small>
                          {workspace.memberCount}{' '}
                          {workspace.memberCount === 1 ? 'miembro' : 'miembros'}
                        </small>
                      </button>
                      <button
                        type="button"
                        className="linkish"
                        disabled={busy}
                        onClick={() => handleDeleteWorkspace(workspace.id)}
                      >
                        Eliminar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        {active === 'team' && (
          <>
            <section className="panel">
              <h2>Workspace activo</h2>
              {selected ? (
                <p className="muted">
                  {selected.name} · /{selected.slug}
                </p>
              ) : (
                <p className="muted">Crea o elige un workspace en Resumen.</p>
              )}
            </section>

            {selected && (
              <>
                <MemberForm onSubmit={handleCreateMember} disabled={busy} />
                <section className="panel">
                  <div className="panel-header">
                    <h2>Equipo</h2>
                    <span className="count">{members.length}</span>
                  </div>
                  {members.length === 0 ? (
                    <p className="muted">Sin miembros.</p>
                  ) : (
                    <ul className="card-list">
                      {members.map((member) => (
                        <li key={member.id}>
                          <div className="card static">
                            <strong>{member.email}</strong>
                            <small>{ROLE_LABELS[member.role]}</small>
                          </div>
                          <button
                            type="button"
                            className="linkish"
                            disabled={busy}
                            onClick={() => handleDeleteMember(member.id)}
                          >
                            Quitar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </>
        )}

        {(active === 'projects' || active === 'board') && (
          <section className="panel">
            <h2>{active === 'projects' ? 'Proyectos' : 'Tablero'}</h2>
            <p className="muted">Esta parte llega en los siguientes días.</p>
          </section>
        )}
      </main>
    </div>
  )
}
