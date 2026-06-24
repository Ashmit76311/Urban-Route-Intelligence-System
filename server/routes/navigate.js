const express = require('express');
const router = express.Router();

router.get('/routes', (req, res) => {
  res.json({ message: 'Route endpoint — Phase 1 impl pending' });
});

module.exports = router;
