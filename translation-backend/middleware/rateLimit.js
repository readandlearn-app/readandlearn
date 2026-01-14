// Rate limiting middleware configuration
const rateLimit = require('express-rate-limit');

// Rate limiter configuration via environment variables
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000; // Default: 1 minute
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 30; // Default: 30 requests per window

/**
 * Rate limiter middleware
 * Skips /health endpoint for monitoring needs
 */
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for /health endpoint (monitoring needs)
  skip: (req) => req.path === '/health',
  message: {
    error: 'Too Many Requests',
    message: `Rate limit exceeded. Please wait ${Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)} seconds before making more requests.`,
    retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)
  }
});

module.exports = {
  limiter,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS
};
