// API key validation middleware
// Validates Claude API key at startup and protects Claude-dependent endpoints

// Flag to track API key validity (set at startup)
let apiKeyValid = false;

/**
 * Validate Claude API key by making a minimal API call
 * Uses max_tokens: 1 to minimize cost (~$0.000001)
 * @returns {Promise<boolean>} True if API key is valid
 */
async function validateApiKey() {
  const apiKey = process.env.CLAUDE_API_KEY;

  if (!apiKey || apiKey === 'your-ai-api-key-here') {
    console.error('❌ CLAUDE_API_KEY not configured');
    console.error('   Get your key from: https://console.anthropic.com/');
    return false;
  }

  try {
    console.log('🔑 Validating Claude API key...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{
          role: 'user',
          content: 'Hi'
        }]
      })
    });

    if (response.ok) {
      console.log('✅ Claude API key validated successfully');
      return true;
    }

    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || response.statusText;

    if (response.status === 401) {
      console.error('❌ Invalid CLAUDE_API_KEY: Authentication failed');
      console.error('   Get your key from: https://console.anthropic.com/');
    } else if (response.status === 403) {
      console.error('❌ CLAUDE_API_KEY lacks required permissions');
      console.error('   Error:', errorMessage);
    } else {
      console.error(`❌ API key validation failed (${response.status}):`, errorMessage);
    }

    return false;
  } catch (error) {
    console.error('❌ API key validation error:', error.message);
    console.error('   This may be a network issue. Server will continue but Claude API calls may fail.');
    return false;
  }
}

/**
 * Initialize API key validation at startup
 * Sets the apiKeyValid flag based on validation result
 */
async function initApiKeyValidation() {
  const valid = await validateApiKey();
  apiKeyValid = valid;
  if (!valid) {
    console.warn('⚠️  Server running with invalid/missing API key');
    console.warn('   Claude-dependent endpoints will return 503');
  }
  return valid;
}

/**
 * Get current API key validity status
 * @returns {boolean} Current API key validity state
 */
function getApiKeyValid() {
  return apiKeyValid;
}

/**
 * Middleware to check API key validity before Claude-dependent endpoints
 */
function requireValidApiKey(req, res, next) {
  if (!apiKeyValid) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Claude API key is not configured or invalid. Please check server configuration.',
      hint: 'Set CLAUDE_API_KEY in your environment. Get your key from https://console.anthropic.com/'
    });
  }
  next();
}

module.exports = {
  validateApiKey,
  initApiKeyValidation,
  getApiKeyValid,
  requireValidApiKey
};
