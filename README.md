# Urban Risk Intelligence System (URIS)

Safety-aware route planning for urban commuters. Compare fastest vs safest routes with numeric risk scores, heatmap visualization, and incident reporting.

**Live demo:** [urban-route-intelligence-system.vercel.app](https://urban-route-intelligence-system.vercel.app)

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
cp .env.example .env   # fill in values — never commit this file
npm install
npm run dev            # http://localhost:3001
```

### Frontend

```bash
cd client
cp .env.local.example .env.local   # fill in values — never commit this file
npm install
npm run dev            # http://localhost:5180
```

URIS uses port **5180** by default so it does not conflict with other Vite apps on 5173.

### Database Migration

```bash
cd server
node run-migration.js
```

Or: `psql "$DATABASE_URL" -f server/db/migrations/001_initial.sql`

## Deployment

### Render (backend + Postgres)

1. Create a PostgreSQL instance on Render; copy **External Database URL**.
2. Create a **Web Service** from this repo:
   - Root directory: `server`
   - Build: `npm install`
   - Start: `node server.js`
3. Set environment variables in the Render dashboard (not in code):
   - `DATABASE_URL`, `MAPBOX_SECRET_TOKEN`, `OPENWEATHER_API_KEY`
   - `CLIENT_URL` = your Vercel URL (e.g. `https://urban-route-intelligence-system.vercel.app`)
4. Test: `https://your-service.onrender.com/health`

### Vercel (frontend)

1. Import this repo; set root directory to `client`.
2. Set environment variables in the Vercel dashboard:
   - `VITE_MAPBOX_PUBLIC_TOKEN` = Mapbox public token (`pk.…`)
   - `VITE_API_URL` = `https://your-service.onrender.com/api`
3. Redeploy after env vars are set.

### GitHub Actions secrets (CI)

Add `VITE_MAPBOX_PUBLIC_TOKEN` and `VITE_API_URL` under **Settings → Secrets → Actions**.

## API keys & security

| Secret | Where it lives | In git? | In browser? |
|--------|----------------|---------|-------------|
| `MAPBOX_SECRET_TOKEN` (`sk.…`) | Render env only | **No** | **No** |
| `OPENWEATHER_API_KEY` | Render env only | **No** | **No** |
| `DATABASE_URL` | Render env only | **No** | **No** |
| `VITE_MAPBOX_PUBLIC_TOKEN` (`pk.…`) | Vercel env | **No** | **Yes** (required for map tiles) |

`.env` and `.env.local` are gitignored. Only placeholder `.env.example` files are committed.

The Mapbox **public** token (`pk.…`) is visible in the deployed frontend bundle — that is expected. Restrict it by URL in the [Mapbox dashboard](https://account.mapbox.com/access-tokens/). Never put `sk.…` or database URLs in client code or committed files.

## Health Check

- Backend: `GET /health` → `{ "status": "ok", "ts": "..." }`

## Progress

- [x] Phase 0 — repo, CI, deploy skeleton
- [x] Phase 1 — map, search, Mapbox routes, fast/safe UI (risk placeholder)
- [ ] Phase 2 — synthetic incidents, ML risk grid, heatmap

## Data Honesty

- **Weather:** real (OpenWeatherMap)
- **Incidents:** synthetic seed data + user reports (see `DATA_METHODOLOGY.md` in Phase 2)
