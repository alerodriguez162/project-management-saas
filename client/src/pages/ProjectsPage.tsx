import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createProject, deleteProject, fetchProjects } from '../api'
import { ProjectForm } from '../components/ProjectForm'
import { useMesa } from '../context/MesaContext'
import type { Project } from '../types'

export function ProjectsPage() {
  const { workspaceId = '' } = useParams()
  const navigate = useNavigate()
  const { busy, setBusy, setNotice } = useMesa()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchProjects(workspaceId)
      .then((data) => {
        if (!cancelled) setProjects(data)
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

  async function handleCreate(input: { name: string; key?: string; description?: string }) {
    setBusy(true)
    setNotice(null)
    try {
      const project = await createProject(workspaceId, input)
      setProjects((current) => [project, ...current])
      setNotice({ type: 'success', message: `Proyecto ${project.key} creado.` })
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al crear el proyecto',
      })
      throw err
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(projectId: string) {
    setBusy(true)
    setNotice(null)
    try {
      await deleteProject(workspaceId, projectId)
      setProjects((current) => current.filter((project) => project.id !== projectId))
      setNotice({ type: 'success', message: 'Proyecto eliminado.' })
    } catch (err) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al eliminar el proyecto',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <header className="app-header">
        <p className="eyebrow">Proyectos</p>
        <h1>Listado</h1>
        <p className="lede">Cada proyecto tiene una clave corta. Los issues se numeran como CLAVE-1.</p>
      </header>

      <ProjectForm onSubmit={handleCreate} disabled={busy} />

      <section className="panel">
        <div className="panel-header">
          <h2>Proyectos</h2>
          <span className="count">{loading ? '…' : projects.length}</span>
        </div>
        {loading ? (
          <p className="muted">Cargando…</p>
        ) : projects.length === 0 ? (
          <p className="muted">No hay proyectos. Crea el primero para usar el tablero.</p>
        ) : (
          <ul className="card-list">
            {projects.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  className="card"
                  onClick={() => navigate(`/w/${workspaceId}/board?project=${project.id}`)}
                >
                  <strong>
                    {project.key} · {project.name}
                  </strong>
                  {project.description && <span>{project.description}</span>}
                  <small>
                    {project.issueCount} {project.issueCount === 1 ? 'issue' : 'issues'}
                  </small>
                </button>
                <button
                  type="button"
                  className="linkish"
                  disabled={busy}
                  onClick={() => handleDelete(project.id)}
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
