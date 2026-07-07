# URIS — Urban Risk Intelligence System

An AI-powered navigation platform that recommends safer city routes using
dynamic risk assessment — built as a solo full-stack portfolio project.

**Live demo:** https://urban-route-intelligence-system.vercel.app/

## What It Does
- Generates Fastest and Safest route alternatives between any two points in Delhi NCR
- Scores routes using a pre-trained Random Forest model (R² = 0.93, MAE = 4.5 pts)
- Visualizes risk as a color-coded H3 hexagonal heatmap
- Adjusts risk scores in real time based on current weather conditions
- Tracks live location during navigation and warns when entering high-risk zones
- Accepts user incident reports that immediately update the risk heatmap

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
│  PostgreSQL + PostGIS       │  Render
│  risk_grid (H3 hex cells)   │
│  incidents                  │
│  weather_cache              │
│  routes_log                 │
└─────────────────────────────┘

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
```bash
# Backend
cd server && npm install
cp .env.example .env   # fill in your keys
npm run dev

# Frontend
cd client && npm install
cp .env.local.example .env.local   # fill in VITE_MAPBOX_PUBLIC_TOKEN
npm run dev

# ML pipeline (first-time setup only)
cd ml
python -m venv venv && venv/Scripts/activate
pip install h3==3.7.6 --only-binary=:all:
pip install -r requirements.txt
python generate_data.py
python train_model.py
python compute_grid.py
python seed_db.py
```

## Data Methodology
Incident data is synthetic — see [ml/DATA_METHODOLOGY.md](ml/DATA_METHODOLOGY.md)
for full explanation of what the model does and does not represent.

## Architecture
```
React + Mapbox GL JS
        ↓ HTTPS/REST
Node.js + Express
   ↓              ↓
Mapbox        OpenWeatherMap
Directions        (real)
   ↓
PostgreSQL + PostGIS
(H3 risk grid — precomputed by Random Forest)
```
## 👤 Author

**Ashmit Kumar Srivastav**
- GitHub: [@Ashmit76311](https://github.com/Ashmit76311)
