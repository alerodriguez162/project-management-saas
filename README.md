# Mesa — Project Management SaaS

SaaS de gestión de proyectos para **Apex Bench**: workspaces, miembros, proyectos y tablero de issues.

## Stack

- **Frontend:** React + TypeScript + Vite + React Router
- **Backend:** Node.js + Express + TypeScript
- **Database:** SQLite (`better-sqlite3`) en `server/data/mesa.db`

## Producto

- Workspaces con owner, admins y miembros
- Proyectos con clave corta (`MOB-1`, `API-2`)
- Tablero kanban (backlog → hecho), asignación, filtros y detalle
- Persistencia local SQLite; borrar un workspace o proyecto cascada los issues

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET/POST | `/api/workspaces` | List / create (`name`, `ownerEmail`) |
| GET/PATCH/DELETE | `/api/workspaces/:id` | Workspace |
| GET | `/api/workspaces/:id/stats` | Counts |
| GET/POST | `/api/workspaces/:id/members` | Members (`email`, `role`) |
| PATCH/DELETE | `/api/workspaces/:id/members/:memberId` | Role / remove |
| GET/POST | `/api/workspaces/:id/projects` | Projects (`name`, `key`, `description`) |
| GET/PATCH/DELETE | `/api/workspaces/:id/projects/:projectId` | Project |
| GET/POST | `/api/workspaces/:id/projects/:projectId/issues` | Issues (`?status=&priority=&assignee=&q=`) |
| GET/PATCH/DELETE | `/api/workspaces/:id/projects/:projectId/issues/:issueId` | Issue |

Roles: `owner` \| `admin` \| `member`. Estados: `backlog` \| `todo` \| `in_progress` \| `done`. El workspace debe conservar al menos un owner.

## Getting started

```bash
npm install
npm run dev:server   # http://localhost:3001
npm run dev:client   # http://localhost:5173
```

Health check: `GET http://localhost:3001/api/health`
