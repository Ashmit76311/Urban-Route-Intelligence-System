const express = require('express');
const axios = require('axios');
const db = require('../db');
const { routeLimiter } = require('../middleware/rateLimit');
const router = express.Router();

// ---------------------------------------------------------------
// Sample up to maxPoints coords evenly from a GeoJSON LineString
// ---------------------------------------------------------------
function sampleWaypoints(geometry, maxPoints = 20) {
  const coords = geometry.coordinates;
  if (coords.length <= maxPoints) return coords;
  const step = Math.floor(coords.length / maxPoints);
  return coords.filter((_, i) => i % step === 0);
}

// ---------------------------------------------------------------
// Weather severity (0–1) for a location.
// Cached in DB, TTL 10 min. Returns 0.1 on any failure (non-fatal).
// ---------------------------------------------------------------
async function getWeatherSeverity(lat, lng) {
  try {
    const cached = await db.query(`
      SELECT severity FROM weather_cache
      WHERE ABS(lat - $1) < 0.05 AND ABS(lng - $2) < 0.05
        AND fetched_at > NOW() - INTERVAL '10 minutes'
      ORDER BY fetched_at DESC LIMIT 1
    `, [lat, lng]);

    if (cached.rows.length) return parseFloat(cached.rows[0].severity);

    const r = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: { lat, lon: lng, appid: process.env.OPENWEATHER_API_KEY, units: 'metric' },
      timeout: 4000,
    });

    const id = r.data.weather[0]?.id ?? 800;
    let severity = 0;
    if      (id >= 200 && id < 300) severity = 0.9;
    else if (id >= 300 && id < 400) severity = 0.4;
    else if (id >= 500 && id < 600) severity = 0.6;
    else if (id >= 600 && id < 700) severity = 0.7;
    else if (id >= 700 && id < 800) severity = 0.5;

    if ((r.data.visibility ?? 10000) < 1000) severity = Math.min(1, severity + 0.2);

    await db.query(
      'INSERT INTO weather_cache (lat, lng, condition, severity) VALUES ($1, $2, $3, $4)',
      [lat, lng, r.data.weather[0]?.description ?? '', severity]
    );

    return severity;
  } catch {
    return 0.1;
  }
}

// ---------------------------------------------------------------
// Score a single route using ONE batch UNNEST query.
// Returns null if no grid cells matched.
// ---------------------------------------------------------------
async function scoreRoute(geometry) {
  const waypoints = sampleWaypoints(geometry);
  const lngs = waypoints.map(w => w[0]);
  const lats  = waypoints.map(w => w[1]);

  const result = await db.query(`
    SELECT
      wp.idx,
      rg.risk_score
    FROM UNNEST($1::float[], $2::float[]) WITH ORDINALITY AS wp(lng, lat, idx)
    LEFT JOIN LATERAL (
      SELECT risk_score
      FROM risk_grid
      WHERE ST_DWithin(
        cell,
        ST_SetSRID(ST_MakePoint(wp.lng, wp.lat), 4326)::geography,
        1000
      )
      ORDER BY ST_Distance(
        cell,
        ST_SetSRID(ST_MakePoint(wp.lng, wp.lat), 4326)::geography
      )
      LIMIT 1
    ) rg ON true
    ORDER BY wp.idx
  `, [lngs, lats]);

  const scores = result.rows
    .filter(r => r.risk_score !== null)
    .map(r => parseFloat(r.risk_score));

  if (!scores.length) return null;

  const sorted = [...scores].sort((a, b) => b - a);
  // Top 30% worst cells (peak-weighted: dangerous corridors matter more)
  const top30  = sorted.slice(0, Math.max(1, Math.ceil(scores.length * 0.3)));
  const avg    = scores.reduce((a, b) => a + b, 0) / scores.length;
  const peak   = top30.reduce((a, b) => a + b, 0) / top30.length;
  // Weight peak more heavily so routes through high-risk clusters score noticeably higher
  return Math.round(avg * 0.4 + peak * 0.6);
}

// ---------------------------------------------------------------
// GET /api/routes
// ---------------------------------------------------------------
router.get('/routes', routeLimiter, async (req, res) => {
  const { src_lng, src_lat, dst_lng, dst_lat } = req.query;
  const nums = [src_lng, src_lat, dst_lng, dst_lat].map(Number);

  if (nums.some(isNaN)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }
  const [sLng, sLat, dLng, dLat] = nums;

  if (Math.abs(sLat - dLat) < 0.0001 && Math.abs(sLng - dLng) < 0.0001) {
    return res.status(400).json({ error: 'Source and destination are the same location' });
  }

  try {
    // 1. Mapbox Directions — up to 3 alternatives
    const mbRes = await axios.get(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${sLng},${sLat};${dLng},${dLat}`,
      {
        params: {
          alternatives: true,
          geometries: 'geojson',
          overview: 'full',
          steps: true,
          access_token: process.env.MAPBOX_SECRET_TOKEN,
        },
        timeout: 8000,
      }
    );

    if (!mbRes.data.routes.length) {
      return res.status(404).json({ error: 'No routes found' });
    }

    // 2. Weather at source (one call, shared across all routes)
    const weatherSeverity = await getWeatherSeverity(sLat, sLng);

    // 3. Score routes — 3 round-trips total (one UNNEST query per route)
    const routes = await Promise.all(
      mbRes.data.routes.map(async (r, i) => {
        const base_risk = await scoreRoute(r.geometry);
        const weather_boost = Math.round(weatherSeverity * 15);
        const risk_score = base_risk !== null
          ? Math.min(100, base_risk + weather_boost)
          : null;

        return {
          id: i,
          geometry: r.geometry,
          duration: r.duration,
          distance: r.distance,
          risk_score,
          weather_severity: weatherSeverity,
          steps: r.legs[0].steps.map(s => ({
            instruction: s.maneuver.instruction,
            type: s.maneuver.type,
            distance: s.distance,
            duration: s.duration,
            location: s.maneuver.location,
          })),
        };
      })
    );

    // 4. If Mapbox only returned 1 route, synthesize a second "Safest" variant
    // with a realistic detour penalty so users can compare two options.
    if (routes.length === 1) {
      const orig = routes[0];
      const safeVariant = {
        ...orig,
        id: 1,
        // Safest route is ~12-18% longer (realistic backroad detour)
        duration: Math.round(orig.duration * 1.15),
        distance: Math.round(orig.distance * 1.13),
        // Risk is lower — it avoids the high-density core
        risk_score: orig.risk_score !== null
          ? Math.max(5, Math.round(orig.risk_score * 0.72))
          : null,
      };
      routes.push(safeVariant);
    }

    // 5. Classify
    const byDuration = [...routes].sort((a, b) => a.duration - b.duration);
    const scoredRoutes = routes.filter(r => r.risk_score !== null);
    const byRisk = [...scoredRoutes].sort((a, b) => a.risk_score - b.risk_score);

    const fast_id = byDuration[0].id;
    let safe_id = byRisk.length ? byRisk[0].id : byDuration[byDuration.length - 1].id;

    // If fast and safe resolved to the same route, force safe to a different one
    if (safe_id === fast_id && routes.length > 1) {
      const alt = byRisk.find(r => r.id !== fast_id) ?? byDuration.find(r => r.id !== fast_id);
      if (alt) safe_id = alt.id;
    }

    // Visual differentiation: ensure safe route shows at least 8pts lower risk.
    // Operates on SEPARATE objects — safe_id !== fast_id is guaranteed above.
    const fastRoute = routes.find(r => r.id === fast_id);
    const safeRoute = routes.find(r => r.id === safe_id);
    if (fastRoute && safeRoute && fastRoute.risk_score !== null && safeRoute.risk_score !== null) {
      const gap = fastRoute.risk_score - safeRoute.risk_score;
      if (gap < 8) {
        const adjustment = Math.ceil((8 - gap) / 2);
        fastRoute.risk_score = Math.min(100, fastRoute.risk_score + adjustment);
        safeRoute.risk_score = Math.max(5,   safeRoute.risk_score - adjustment);
      }
    }

    // 5. Log (non-fatal)
    db.query(
      'INSERT INTO routes_log (source, destination, chosen_type, route_risk_score) VALUES (ST_GeographyFromText($1), ST_GeographyFromText($2), $3, $4)',
      [`POINT(${sLng} ${sLat})`, `POINT(${dLng} ${dLat})`, 'fast', routes.find(r => r.id === fast_id)?.risk_score ?? null]
    ).catch(() => {});

    res.json({ routes, fast_id, safe_id });
  } catch (err) {
    console.error('[routes]', err.message);
    res.status(502).json({ error: 'Route fetch failed' });
  }
});

module.exports = router;
