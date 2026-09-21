import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { MesaProvider } from './context/MesaContext'
import { BoardPage } from './pages/BoardPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { TeamPage } from './pages/TeamPage'
import { WorkspacesPage } from './pages/WorkspacesPage'
import './App.css'

export default function App() {
  return (
    <MesaProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<WorkspacesPage />} />
            <Route path="/w/:workspaceId" element={<DashboardPage />} />
            <Route path="/w/:workspaceId/team" element={<TeamPage />} />
            <Route path="/w/:workspaceId/projects" element={<ProjectsPage />} />
            <Route path="/w/:workspaceId/board" element={<BoardPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </MesaProvider>
  )
}
