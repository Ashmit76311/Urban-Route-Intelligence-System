# Urban Risk Intelligence System (URIS)

Safety-aware route planning for urban commuters. Compare fastest vs safest routes with numeric risk scores, heatmap visualization, and incident reporting.

## Stack

- **Frontend:** React + Vite, Mapbox GL JS (Vercel)
- **Backend:** Node.js + Express (Render)
- **Database:** PostgreSQL + PostGIS
- **ML:** Python scikit-learn Random Forest (Phase 2)

## Project Structure

```
uris/
├── client/              # React + Vite frontend
├── server/              # Node.js + Express API
├── .github/workflows/   # CI
└── README.md
```

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL with PostGIS (or Render-hosted DB)

### Backend

```bash
cd server
cp .env.example .env   # fill in values
npm install
npm run dev            # http://localhost:3001
```

### Frontend

```bash
cd client
cp .env.local.example .env.local   # fill in values
npm install
npm run dev            # http://localhost:5173
```

### Database Migration

```bash
psql "$DATABASE_URL" -f server/db/migrations/001_initial.sql
```

## Health Check

- Backend: `GET /health` → `{ "status": "ok", "ts": "..." }`

## Phase 0 Status

- [x] Repo structure
- [x] Frontend scaffold (Vite + React)
- [x] Backend scaffold (Express)
- [x] DB migration SQL
- [x] CI workflow

## Data Honesty

- **Weather:** real (OpenWeatherMap)
- **Incidents:** synthetic seed data + user reports (see `DATA_METHODOLOGY.md` in Phase 2)
