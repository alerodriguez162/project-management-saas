# Mesa — Project Management SaaS

Base de un SaaS de gestión de proyectos (workspaces, proyectos y tableros) para **Apex Bench**.

Esta entrega es solo el scratch: monorepo, health API y shell del cliente. Sin CRUD todavía.

## Stack

- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + Express + TypeScript
- **Siguiente persistencia:** SQLite (`better-sqlite3`)

## Daily plan

| Day | Branch | Focus |
|-----|--------|--------|
| 1 | `day-1-scaffold` | Monorepo, health API, shell del cliente |
| 2 | `day-2-workspaces` | Workspaces, miembros y persistencia |
| 3 | `day-3-projects` | Proyectos y listado en el cliente |
| 4 | `day-4-boards` | Issues, columnas y tablero |
| 5 | `day-5-features` | Asignación, filtros y detalle |
| 6 | `day-6-polish` | Validación, errores y polish |

Workflow: una rama por día → merge a `main` al final del día.

## API (Day 1)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |

## Getting started

```bash
npm install
npm run dev:server   # http://localhost:3001
npm run dev:client   # http://localhost:5173
```

Health check: `GET http://localhost:3001/api/health`
