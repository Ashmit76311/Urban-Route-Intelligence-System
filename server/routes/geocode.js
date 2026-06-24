const express = require('express');
const router = express.Router();

router.get('/geocode', (req, res) => {
  res.json({ message: 'Geocode endpoint — Phase 1 impl pending' });
});

module.exports = router;
