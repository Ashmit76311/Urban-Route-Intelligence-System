const rateLimit = require('express-rate-limit');

exports.incidentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reports. Try again later.' },
});

exports.routeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Rate limit hit. Slow down.' },
});
