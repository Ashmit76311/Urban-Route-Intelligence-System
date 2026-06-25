const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/geocode', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query too short' });
  }

  try {
    const response = await axios.get(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q.trim())}.json`,
      {
        params: {
          access_token: process.env.MAPBOX_SECRET_TOKEN,
          limit: 5,
          language: 'en',
          country: 'in',
        },
        timeout: 5000,
      },
    );

    const suggestions = response.data.features.map((f) => ({
      id: f.id,
      name: f.place_name,
      coordinates: f.center,
    }));

    res.json({ suggestions });
  } catch (err) {
    console.error('[geocode]', err.message);
    res.status(502).json({ error: 'Geocoding upstream error' });
  }
});

module.exports = router;
