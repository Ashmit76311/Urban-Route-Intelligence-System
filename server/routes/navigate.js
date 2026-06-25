const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/routes', async (req, res) => {
  const { src_lng, src_lat, dst_lng, dst_lat } = req.query;

  if (!src_lng || !src_lat || !dst_lng || !dst_lat) {
    return res.status(400).json({ error: 'Missing coordinates' });
  }

  const coords = [src_lng, src_lat, dst_lng, dst_lat].map(Number);
  if (coords.some(isNaN)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }

  try {
    const response = await axios.get(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${src_lng},${src_lat};${dst_lng},${dst_lat}`,
      {
        params: {
          alternatives: true,
          geometries: 'geojson',
          overview: 'full',
          steps: false,
          access_token: process.env.MAPBOX_SECRET_TOKEN,
        },
        timeout: 8000,
      },
    );

    if (!response.data.routes.length) {
      return res.status(404).json({ error: 'No routes found' });
    }

    const routes = response.data.routes.map((r, i) => ({
      id: i,
      geometry: r.geometry,
      duration: r.duration,
      distance: r.distance,
      risk_score: null,
    }));

    const byDuration = [...routes].sort((a, b) => a.duration - b.duration);
    const fast_id = byDuration[0].id;
    const safe_id = byDuration[byDuration.length - 1].id;

    res.json({ routes, fast_id, safe_id });
  } catch (err) {
    console.error('[routes]', err.message);
    const status = err.response?.status || 502;
    res.status(status).json({ error: 'Route fetch failed' });
  }
});

module.exports = router;
