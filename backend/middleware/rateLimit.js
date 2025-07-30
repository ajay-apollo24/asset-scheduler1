const rateLimit = require('express-rate-limit');

const adRequestLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: 'Too many ad requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

const impressionLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5000,
  message: 'Too many impression requests from this IP',
});

module.exports = { adRequestLimit, impressionLimit };
