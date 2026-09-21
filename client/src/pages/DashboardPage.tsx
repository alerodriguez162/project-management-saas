import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchWorkspaceStats } from '../api'
import { useMesa } from '../context/MesaContext'
import type { WorkspaceStats } from '../types'

export function DashboardPage() {
  const { workspaceId = '' } = useParams()
  const { workspaces, setNotice } = useMesa()
  const workspace = workspaces.find((item) => item.id === workspaceId)
  const [stats, setStats] = useState<WorkspaceStats | null>(null)

  useEffect(() => {
    if (!workspaceId) return
    let cancelled = false
    fetchWorkspaceStats(workspaceId)
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch((err: Error) => {
        if (!cancelled) setNotice({ type: 'error', message: err.message })
      })
    return () => {
      cancelled = true
    }
  }, [workspaceId, setNotice])

  if (!workspace) {
    return <p className="muted">Workspace no encontrado.</p>
  }

  return (
    <>
      <header className="app-header">
        <p className="eyebrow">Resumen</p>
        <h1>{workspace.name}</h1>
        <p className="lede">Vista general del workspace. Abre un proyecto para trabajar el tablero.</p>
      </header>

      <section className="stats-grid" aria-label="Métricas">
        <article className="stat-card">
          <span>Miembros</span>
          <strong>{stats?.memberCount ?? '…'}</strong>
        </article>
        <article className="stat-card">
          <span>Proyectos</span>
          <strong>{stats?.projectCount ?? '…'}</strong>
        </article>
        <article className="stat-card">
          <span>Issues</span>
          <strong>{stats?.issueCount ?? '…'}</strong>
        </article>
        <article className="stat-card">
          <span>Abiertos</span>
          <strong>{stats?.openIssueCount ?? '…'}</strong>
        </article>
      </section>

      <section className="panel">
        <h2>Siguiente paso</h2>
        <div className="cta-row">
          <Link className="button-link" to={`/w/${workspaceId}/projects`}>
            Crear proyecto
          </Link>
          <Link className="button-link ghost" to={`/w/${workspaceId}/board`}>
            Ir al tablero
          </Link>
          <Link className="button-link ghost" to={`/w/${workspaceId}/team`}>
            Invitar equipo
          </Link>
        </div>
      </section>
    </>
  )
}
