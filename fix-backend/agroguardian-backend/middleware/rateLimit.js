const rateLimit = require('express-rate-limit');

exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 10,
  message: { success: false, message: 'Too many auth attempts — try again in 15 minutes' }
});

exports.apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 min
  max: 100,
  message: { success: false, message: 'Too many requests — slow down' }
});

exports.diseaseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 20,
  message: { success: false, message: 'Disease detection limit reached — try again in 1 hour' }
});
