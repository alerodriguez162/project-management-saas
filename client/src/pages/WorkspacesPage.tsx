import { useNavigate } from 'react-router-dom'
import { createWorkspace, deleteWorkspace } from '../api'
import { WorkspaceForm } from '../components/WorkspaceForm'
import { useMesa } from '../context/MesaContext'

export function WorkspacesPage() {
  const navigate = useNavigate()
  const { workspaces, setWorkspaces, busy, setBusy, setNotice } = useMesa()

  async function handleCreate(input: { name: string; ownerEmail: string }) {
    setBusy(true)
    setNotice(null)
    try {
      const workspace = await createWorkspace(input)
      setWorkspaces((current) => [workspace, ...current])
      setNotice({ type: 'success', message: 'Workspace creado.' })
      navigate(`/w/${workspace.id}`)
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

  async function handleDelete(id: string) {
    setBusy(true)
    setNotice(null)
    try {
      await deleteWorkspace(id)
      setWorkspaces((current) => current.filter((workspace) => workspace.id !== id))
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

  return (
    <>
      <header className="app-header">
        <p className="eyebrow">Mesa</p>
        <h1>Workspaces</h1>
        <p className="lede">
          Crea un equipo, invita miembros y abre proyectos con tablero de issues.
        </p>
      </header>

      <WorkspaceForm onSubmit={handleCreate} disabled={busy} />

      <section className="panel">
        <div className="panel-header">
          <h2>Tus workspaces</h2>
          <span className="count">{workspaces.length}</span>
        </div>
        {workspaces.length === 0 ? (
          <p className="muted">No hay workspaces todavía. Crea el primero arriba.</p>
        ) : (
          <ul className="card-list">
            {workspaces.map((workspace) => (
              <li key={workspace.id}>
                <button
                  type="button"
                  className="card"
                  onClick={() => navigate(`/w/${workspace.id}`)}
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
                  onClick={() => handleDelete(workspace.id)}
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
