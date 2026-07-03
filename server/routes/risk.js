const express = require('express');
const db = require('../db');
const router = express.Router();

// ---------------------------------------------------------------
// GET /api/risk/grid
// Query params: sw_lat, sw_lng, ne_lat, ne_lng
// Returns GeoJSON FeatureCollection of hex cells in viewport.
// ---------------------------------------------------------------
router.get('/risk/grid', async (req, res) => {
  const { sw_lat, sw_lng, ne_lat, ne_lng } = req.query;
  const nums = [sw_lng, sw_lat, ne_lng, ne_lat].map(Number);

  if (nums.some(isNaN)) {
    return res.status(400).json({ error: 'Valid bounding box required: sw_lat, sw_lng, ne_lat, ne_lng' });
  }
  const [minLng, minLat, maxLng, maxLat] = nums;

  try {
    const result = await db.query(`
      SELECT
        id,
        risk_score,
        ST_AsGeoJSON(cell::geometry) AS cell_geojson
      FROM risk_grid
      WHERE ST_Intersects(
        cell,
        ST_MakeEnvelope($1, $2, $3, $4, 4326)::geography
      )
      ORDER BY risk_score DESC
      LIMIT 500
    `, [minLng, minLat, maxLng, maxLat]);

    const features = result.rows.map(row => ({
      type: 'Feature',
      geometry: JSON.parse(row.cell_geojson),
      properties: {
        id: row.id,
        risk_score: parseFloat(row.risk_score),
        risk_level:
          row.risk_score >= 65 ? 'high' :
          row.risk_score >= 35 ? 'medium' : 'low',
      },
    }));

    res.json({ type: 'FeatureCollection', features });
  } catch (err) {
    console.error('[risk/grid]', err.message);
    res.status(500).json({ error: 'Risk grid fetch failed' });
  }
});

// ---------------------------------------------------------------
// POST /api/risk/score
// Body: { waypoints: [[lng, lat], ...] }
// Batch UNNEST query — one round-trip regardless of waypoint count.
// ---------------------------------------------------------------
router.post('/risk/score', async (req, res) => {
  const { waypoints } = req.body;
  if (!Array.isArray(waypoints) || waypoints.length === 0) {
    return res.status(400).json({ error: 'waypoints array required' });
  }

  const lngs = waypoints.map(w => w[0]);
  const lats  = waypoints.map(w => w[1]);

  try {
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

    if (!scores.length) return res.json({ risk_score: null });

    const sorted = [...scores].sort((a, b) => b - a);
    const top20  = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.2)));
    const avg    = scores.reduce((a, b) => a + b, 0) / scores.length;
    const peak   = top20.reduce((a, b) => a + b, 0) / top20.length;
    const risk_score = Math.min(100, Math.max(0, Math.round(avg * 0.7 + peak * 0.3)));

    res.json({ risk_score });
  } catch (err) {
    console.error('[risk/score]', err.message);
    res.status(500).json({ error: 'Risk scoring failed' });
  }
});

// ---------------------------------------------------------------
// POST /api/risk/reset
// ---------------------------------------------------------------
router.post('/risk/reset', async (req, res) => {
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    await db.query(`
      UPDATE risk_grid
      SET risk_score = baseline_score,
          computed_at = NOW()
      WHERE baseline_score IS NOT NULL
    `);
    res.json({ message: 'Risk grid reset to baseline.' });
  } catch (err) {
    console.error('[risk/reset]', err.message);
    res.status(500).json({ error: 'Reset failed' });
  }
});

module.exports = router;
