// Health and utility routes
const express = require('express');
const router = express.Router();

// These will be injected via init()
let pool = null;
let apiKeyValid = null;
let SUPPORTED_LANGUAGES = null;

/**
 * Initialize route dependencies
 */
function init(deps) {
  pool = deps.pool;
  apiKeyValid = deps.getApiKeyValid;
  SUPPORTED_LANGUAGES = deps.SUPPORTED_LANGUAGES;
}

// ========================================
// ENDPOINT: Health Check
// ========================================
router.get('/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW()');
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      apiKeyConfigured: !!process.env.CLAUDE_API_KEY,
      apiKeyValid: apiKeyValid(),
      database: 'connected',
      caching: process.env.ENABLE_CACHING === 'true'
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      apiKeyValid: apiKeyValid(),
      database: 'disconnected',
      error: err.message
    });
  }
});

// ========================================
// ENDPOINT: Supported Languages
// ========================================
router.get('/languages', (req, res) => {
  res.json({
    languages: SUPPORTED_LANGUAGES,
    total: Object.keys(SUPPORTED_LANGUAGES).length,
    default: 'fr'
  });
});

// ========================================
// ENDPOINT: Get Stats
// ========================================
router.get('/stats', async (req, res) => {
  try {
    const cacheStats = await pool.query(
      'SELECT COUNT(*) as total, SUM(hit_count) as total_hits FROM analyses'
    );

    const usageStats = await pool.query(
      `SELECT
        COUNT(*) as total_requests,
        SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits,
        SUM(tokens_used) as total_tokens,
        SUM(cost_usd) as total_cost
       FROM usage_log
       WHERE timestamp > NOW() - INTERVAL '24 hours'`
    );

    const deckStats = await pool.query(
      'SELECT COUNT(*) as total_cards, COUNT(DISTINCT user_id) as total_users FROM deck_cards'
    );

    res.json({
      cache: cacheStats.rows[0],
      usage_24h: usageStats.rows[0],
      deck: deckStats.rows[0]
    });

  } catch (error) {
    console.error('❌ Error fetching stats:', error.message);
    res.status(500).json({ error: 'Failed to fetch stats', message: error.message });
  }
});

module.exports = { router, init };
