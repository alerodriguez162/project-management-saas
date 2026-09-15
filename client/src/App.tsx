import { useEffect, useState } from 'react'
import { fetchHealth } from './api'
import type { HealthResponse, NavItem } from './types'
import './App.css'

const NAV: NavItem[] = [
  { id: 'overview', label: 'Resumen', hint: 'Estado del workspace' },
  { id: 'projects', label: 'Proyectos', hint: 'Próximo: listado y claves' },
  { id: 'board', label: 'Tablero', hint: 'Próximo: issues y columnas' },
  { id: 'team', label: 'Equipo', hint: 'Próximo: miembros y roles' },
]

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState('overview')

  useEffect(() => {
    let cancelled = false

    fetchHealth()
      .then((data) => {
        if (!cancelled) setHealth(data)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [])

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
          <p className="eyebrow">Apex Bench · Day 1</p>
          <h1>Scratch del SaaS</h1>
          <p className="lede">
            Monorepo listo: cliente Vite, API Express y health check. El CRUD de
            workspaces y tableros llega en los siguientes días.
          </p>
        </header>

        <section className="panel">
          <h2>API</h2>
          {error ? (
            <p className="banner error" role="status">
              {error}. Arranca el server en el puerto 3001.
            </p>
          ) : health ? (
            <dl className="health">
              <div>
                <dt>Estado</dt>
                <dd>{health.status}</dd>
              </div>
              <div>
                <dt>Servicio</dt>
                <dd>{health.service}</dd>
              </div>
              <div>
                <dt>Producto</dt>
                <dd>{health.product}</dd>
              </div>
              <div>
                <dt>Timestamp</dt>
                <dd>{health.timestamp}</dd>
              </div>
            </dl>
          ) : (
            <p className="muted">Comprobando `/api/health`…</p>
          )}
        </section>

        <section className="panel">
          <h2>Dominio previsto</h2>
          <ul className="roadmap">
            <li>Workspace y miembros</li>
            <li>Proyectos con clave corta</li>
            <li>Issues con estado y prioridad</li>
            <li>Tablero kanban</li>
          </ul>
        </section>
      </main>
    </div>
  )
}
