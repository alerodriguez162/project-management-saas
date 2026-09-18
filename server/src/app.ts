import cors from 'cors'
import express from 'express'
import workspacesRouter from './routes/workspaces.js'

export const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'project-management-saas-api',
    product: 'mesa',
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/workspaces', workspacesRouter)

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})
