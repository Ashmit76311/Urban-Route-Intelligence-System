const express = require('express');
const db = require('../db');
const { incidentLimiter } = require('../middleware/rateLimit');
const router = express.Router();

const VALID_TYPES = ['accident', 'crime', 'roadblock', 'unsafe'];
const DELHI_BOUNDS = { latMin: 28.30, latMax: 28.95, lngMin: 76.70, lngMax: 77.50 };

router.post('/incidents', incidentLimiter, async (req, res) => {
  const { type, lat, lng, note } = req.body;

  // Validate type
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
  }

  // Validate coordinates + bounds
  const latN = parseFloat(lat);
  const lngN = parseFloat(lng);
  if (isNaN(latN) || isNaN(lngN)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }
  if (
    latN < DELHI_BOUNDS.latMin || latN > DELHI_BOUNDS.latMax ||
    lngN < DELHI_BOUNDS.lngMin || lngN > DELHI_BOUNDS.lngMax
  ) {
    return res.status(400).json({ error: 'Location outside supported area' });
  }

  // Validate note
  const sanitizedNote = note
    ? String(note).slice(0, 280).trim().replace(/<[^>]*>/g, '')
    : null;

  try {
    const result = await db.query(`
      INSERT INTO incidents (type, location, note, is_synthetic, reporter_ip)
      VALUES ($1, ST_GeographyFromText($2), $3, false, $4)
      RETURNING id, created_at
    `, [
      type,
      `POINT(${lngN} ${latN})`,
      sanitizedNote,
      req.ip,
    ]);

    // Bump risk score of the containing grid cell
    // Non-fatal — if this fails the incident is still saved
    await db.query(`
      UPDATE risk_grid
      SET risk_score = LEAST(100, risk_score + $1),
          computed_at = NOW()
      WHERE ST_DWithin(
        cell,
        ST_GeographyFromText($2),
        500
      )
    `, [
      type === 'crime' || type === 'accident' ? 8 : 4,   // severity of bump
      `POINT(${lngN} ${latN})`,
    ]).catch(e => console.error('[incident bump]', e.message));

    res.status(201).json({
      id: result.rows[0].id,
      created_at: result.rows[0].created_at,
      message: 'Incident reported. Risk map will update shortly.',
    });
  } catch (err) {
    console.error('[incidents POST]', err.message);
    res.status(500).json({ error: 'Failed to save incident' });
  }
});

module.exports = router;
