# URIS — Urban Risk Intelligence System

> Safety-aware navigation for Delhi NCR — recommends routes based on dynamic risk scoring, not just travel time.

**[Live Demo](https://your-vercel-url.vercel.app)** · **[Data Methodology](ml/DATA_METHODOLOGY.md)**

---

## The Problem

Standard navigation apps (Google Maps, Apple Maps) optimize for time and distance. They don't account for safety — crime-prone areas, accident black spots, or zones that become risky after dark. URIS adds a risk dimension to route planning.

---

## What It Does

| Feature | Detail |
|---|---|
| Dual-route comparison | Returns Fastest and Safest alternatives with ETA, distance, and risk score (0–100) |
| Risk heatmap | H3 hexagonal grid (~750 cells over Delhi NCR) rendered as a color-coded overlay |
| ML risk scoring | Random Forest regressor, R² = 0.93, MAE = 4.5 pts on held-out test set |
| Weather integration | OpenWeatherMap adjusts route risk scores in real time (10-min cached) |
| Live navigation | `watchPosition` tracks position, advances turn-by-turn steps, warns on high-risk entry |
| Incident reporting | Users submit reports that immediately bump local cell risk scores via PostGIS UPDATE |

---

## Architecture

```
┌─────────────────────────────┐
│   React + Mapbox GL JS      │  Vercel
│   (map, heatmap, nav strip) │
└────────────┬────────────────┘
             │ HTTPS / REST
┌────────────▼────────────────┐
│   Node.js + Express         │  Render
│   /api/routes               │
│   /api/risk/grid            │
│   /api/incidents            │
└──────┬─────────────┬────────┘
       │             │
┌──────▼──────┐ ┌────▼──────────────┐
│   Mapbox    │ │  OpenWeatherMap   │
│  Directions │ │  (live weather)   │
│    API      │ └───────────────────┘
└──────┬──────┘
       │
┌──────▼──────────────────────┐
│  PostgreSQL + PostGIS        │  Render
│  risk_grid (H3 hex cells)   │
│  incidents                  │
│  weather_cache              │
│  routes_log                 │
└──────────────────────────────┘

Offline (setup only):
Python → scikit-learn RF → precomputed risk grid → seeded into DB
```

---

## Tech Stack

**Frontend:** React, Vite, Mapbox GL JS, browser Geolocation API

**Backend:** Node.js, Express, express-rate-limit, helmet

**Database:** PostgreSQL 15 + PostGIS — spatial queries via `ST_DWithin`, `ST_Intersects`, batch `UNNEST` for route scoring (3 round-trips per request regardless of waypoint count)

**ML:** Python 3.11, scikit-learn (Random Forest), H3 (Uber hex grid), NumPy, pandas, joblib

**Deploy:** Vercel (frontend) + Render free tier (backend + PostgreSQL)

---

## ML Pipeline

The risk engine runs once at setup time and precomputes a static grid. It does not run at request time.

```
generate_data.py   →  2,500 synthetic incidents, Delhi NCR bbox
train_model.py     →  Random Forest regressor, 80/20 split
                       R² = 0.93, MAE = 4.5 pts (held-out test set)
                       Top features: lng, lat, incident severity
compute_grid.py    →  H3 resolution-8 hex grid (~750 cells)
                       Scored at worst-case time (22:00, is_night=1)
seed_db.py         →  Writes grid to PostgreSQL via PostGIS
```

**The incident data is synthetic.** No real crime API exists for Indian cities at street-level resolution. The methodology — why synthetic, what it does and doesn't represent, how labels were generated — is documented in [`ml/DATA_METHODOLOGY.md`](ml/DATA_METHODOLOGY.md). The R² and MAE are real numbers from a genuine held-out evaluation.

---

## Route Scoring Logic

For each route alternative:
1. Sample up to 20 waypoints evenly from the GeoJSON LineString
2. Batch-query `risk_grid` using `UNNEST` + `LATERAL ST_DWithin` — one DB round-trip per route
3. Compute weighted score: `0.7 × avg(all waypoints) + 0.3 × avg(top-20% riskiest waypoints)`
4. Add weather modifier: `min(100, base_risk + weather_severity × 15)`
5. `safe_id` = route with lowest final score; `fast_id` = route with lowest ETA

---

## Local Setup

**Prerequisites:** Node.js 20+, Python 3.11+, PostgreSQL with PostGIS, psql in PATH

```bash
git clone https://github.com/Ashmit76311/uris.git
cd uris
```

**Backend:**
```bash
cd server
npm install
cp .env.example .env        # fill in DATABASE_URL, MAPBOX_SECRET_TOKEN,
                             # OPENWEATHER_API_KEY, ADMIN_TOKEN
npm run dev                  # http://localhost:3001
```

**Frontend:**
```bash
cd client
npm install
cp .env.local.example .env.local   # fill in VITE_MAPBOX_PUBLIC_TOKEN
npm run dev                         # http://localhost:5173
```

**ML pipeline (first-time only — seeds the risk grid into DB):**
```bash
cd ml
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate    # Mac/Linux

pip install h3==3.7.6 --only-binary=:all:   # h3 first — needs pre-built wheel
pip install -r requirements.txt

python generate_data.py        # → data/incidents.csv
python train_model.py          # → models/risk_model.joblib  (prints R² + MAE)
python compute_grid.py         # → data/risk_grid.csv
python seed_db.py              # → seeds PostgreSQL
```

**Verify DB is seeded:**
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM risk_grid;"
# Expected: 700–900 rows
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/routes?src_lng=&src_lat=&dst_lng=&dst_lat=` | Fetch + score route alternatives |
| `GET` | `/api/geocode?q=` | Place search (proxied Mapbox, India-biased) |
| `GET` | `/api/risk/grid?sw_lat=&sw_lng=&ne_lat=&ne_lng=` | GeoJSON hex cells in viewport |
| `POST` | `/api/incidents` | Submit incident report |
| `POST` | `/api/risk/reset` | Reset grid to baseline (requires `x-admin-token` header) |
| `GET` | `/health` | Health check |

---

## Security

- Mapbox secret token and OpenWeatherMap key are never client-side — all third-party calls proxied through the backend
- Mapbox public (`pk.`) token is domain-restricted in the Mapbox dashboard
- `helmet` HTTP security headers on all responses
- Incident submissions: rate-limited (5/hour/IP), bounding-box validated, note length capped at 280 chars, HTML stripped
- HTTPS enforced via Vercel + Render (free TLS)

---

## Demo Reset

If incident reports have raised cell scores before a demo:

```bash
curl -X POST https://your-render-url.onrender.com/api/risk/reset \
  -H "x-admin-token: your_admin_token"
```

Resets all `risk_score` values to `baseline_score` (the original model output).

---

## Project Structure

```
uris/
├── client/                  # React frontend
│   └── src/
│       ├── components/      # Map, SearchBar, RoutePanel, NavigationStrip, IncidentModal
│       └── hooks/           # useGeolocation, useRoutes, useRouteLines,
│                            # useHeatmap, useLiveLocation, useNavigation
├── server/                  # Node.js + Express backend
│   ├── routes/              # geocode, navigate, risk, incidents
│   ├── middleware/          # rateLimit
│   └── db/                  # pg pool, migrations
└── ml/                      # Python ML pipeline
    ├── generate_data.py
    ├── train_model.py
    ├── compute_grid.py
    ├── seed_db.py
    └── DATA_METHODOLOGY.md  # honest explanation of synthetic data
```

---

## Known Constraints

- Risk grid is precomputed, not live — new user incident reports bump cell scores immediately via a heuristic (+4–8 pts), but the underlying RF model is not retrained at runtime
- Step advancement threshold is 30m — works on mobile GPS, unreliable on desktop Wi-Fi geolocation
- Incident data is synthetic and calibrated to Delhi NCR only; the bounding box check in `/api/incidents` rejects coordinates outside this region
- Render free tier spins down after 15 min inactivity — first request after cold start is slower

---

*Built by [Ashmit Kumar Srivastav](https://github.com/Ashmit76311)*
