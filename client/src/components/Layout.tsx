import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { useMesa } from '../context/MesaContext'

const NAV = [
  { to: '', label: 'Resumen', hint: 'Métricas del workspace', end: true },
  { to: '/projects', label: 'Proyectos', hint: 'Claves y listado', end: true },
  { to: '/board', label: 'Tablero', hint: 'Issues y columnas', end: true },
  { to: '/team', label: 'Equipo', hint: 'Miembros y roles', end: true },
] as const

export function Layout() {
  const { workspaceId } = useParams()
  const navigate = useNavigate()
  const { workspaces, apiOnline, notice, setNotice, loading } = useMesa()
  const selected = workspaces.find((workspace) => workspace.id === workspaceId)

  return (
    <div className={workspaceId ? 'shell shell-wide' : 'shell'}>
      <aside className="sidebar">
        <p className="brand">Mesa</p>
        <p className="brand-sub">Project Management</p>

        {workspaces.length > 0 && (
          <label className="workspace-select">
            Workspace
            <select
              value={workspaceId ?? ''}
              onChange={(event) => {
                const next = event.target.value
                navigate(next ? `/w/${next}` : '/')
              }}
            >
              <option value="">Todos</option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <nav aria-label="Módulos">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-item is-active' : 'nav-item')}>
            <span>Workspaces</span>
            <small>Cuentas y equipos</small>
          </NavLink>
          {workspaceId &&
            NAV.map((item) => (
              <NavLink
                key={item.to}
                to={`/w/${workspaceId}${item.to}`}
                end={item.end}
                className={({ isActive }) => (isActive ? 'nav-item is-active' : 'nav-item')}
              >
                <span>{item.label}</span>
                <small>{item.hint}</small>
              </NavLink>
            ))}
        </nav>
      </aside>

      <main className="app">
        {selected && (
          <p className="context-line">
            {selected.name} · /{selected.slug}
          </p>
        )}

        {apiOnline === false && (
          <div className="banner error" role="status">
            <p>No hay conexión con la API. Arranca el server en el puerto 3001.</p>
          </div>
        )}

        {notice && (
          <div className={`banner ${notice.type}`} role="status">
            <p>{notice.message}</p>
            <button type="button" className="linkish" onClick={() => setNotice(null)}>
              Cerrar
            </button>
          </div>
        )}

        {loading ? <p className="muted">Cargando…</p> : <Outlet />}
      </main>
    </div>
  )
}
