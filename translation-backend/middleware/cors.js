// CORS middleware configuration
// Handles Cross-Origin Resource Sharing for Chrome extension and local development

// Default allowed origins for Chrome extension and local development
const DEFAULT_ALLOWED_ORIGINS = 'chrome-extension://*,http://localhost:*,http://127.0.0.1:*';

// Parse allowed origins from environment or use defaults
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS)
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

/**
 * Check if an origin matches any allowed pattern
 * Supports wildcards: chrome-extension://* matches any extension
 * Supports port wildcards: http://localhost:* matches any localhost port
 * @param {string} origin - The origin to check
 * @returns {boolean} True if origin is allowed
 */
function isOriginAllowed(origin) {
  if (!origin) {
    // No origin header (e.g., curl, same-origin requests) - allow
    return true;
  }

  for (const pattern of ALLOWED_ORIGINS) {
    // Exact match
    if (pattern === origin) {
      return true;
    }

    // Pattern matching with wildcards
    if (pattern.includes('*')) {
      // chrome-extension://* matches any chrome-extension:// origin
      if (pattern === 'chrome-extension://*' && origin.startsWith('chrome-extension://')) {
        return true;
      }

      // http://localhost:* matches http://localhost with any port
      if (pattern === 'http://localhost:*' && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
        return true;
      }

      // http://127.0.0.1:* matches http://127.0.0.1 with any port
      if (pattern === 'http://127.0.0.1:*' && /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
        return true;
      }

      // Generic wildcard pattern matching (converts * to .*)
      const regexPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars except *
        .replace(/\*/g, '.*'); // Convert * to .*
      const regex = new RegExp(`^${regexPattern}$`);
      if (regex.test(origin)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * CORS middleware - Add CORS and Private Network Access headers
 */
function corsMiddleware(req, res, next) {
  const origin = req.get('Origin');

  if (isOriginAllowed(origin)) {
    // Set origin to the specific requesting origin (required for credentials)
    // If no origin header, don't set Access-Control-Allow-Origin
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  // If origin not allowed, don't set CORS headers (browser will block)

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
}

module.exports = {
  corsMiddleware,
  isOriginAllowed,
  ALLOWED_ORIGINS
};
