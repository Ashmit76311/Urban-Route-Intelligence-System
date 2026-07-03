# URIS — Urban Risk Intelligence System

An AI-powered navigation platform that recommends safer city routes using
dynamic risk assessment — built as a solo full-stack portfolio project.

**Live demo:** [your-vercel-url.vercel.app](https://your-vercel-url.vercel.app)

## What It Does
- Generates Fastest and Safest route alternatives between any two points in Delhi NCR
- Scores routes using a pre-trained Random Forest model (R² = 0.93, MAE = 4.5 pts)
- Visualizes risk as a color-coded H3 hexagonal heatmap
- Adjusts risk scores in real time based on current weather conditions
- Tracks live location during navigation and warns when entering high-risk zones
- Accepts user incident reports that immediately update the risk heatmap

## Stack
Frontend: React + Mapbox GL JS · Backend: Node.js + Express
Database: PostgreSQL + PostGIS · ML: Python + scikit-learn (Random Forest)
Deploy: Vercel (client) + Render (server + DB)

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
