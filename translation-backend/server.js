require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

// ========================================
// LANGUAGE CONFIGURATION
// ========================================

// All 24 EU CEFR official languages
const SUPPORTED_LANGUAGES = {
  bg: 'Bulgarian', hr: 'Croatian', cs: 'Czech', da: 'Danish',
  nl: 'Dutch', en: 'English', et: 'Estonian', fi: 'Finnish',
  fr: 'French', de: 'German', el: 'Greek', hu: 'Hungarian',
  ga: 'Irish', it: 'Italian', lv: 'Latvian', lt: 'Lithuanian',
  mt: 'Maltese', pl: 'Polish', pt: 'Portuguese', ro: 'Romanian',
  sk: 'Slovak', sl: 'Slovenian', es: 'Spanish', sv: 'Swedish'
};

/**
 * Check if a language code is supported
 * @param {string} code - ISO 639-1 language code
 * @returns {boolean}
 */
function isValidLanguage(code) {
  return code && SUPPORTED_LANGUAGES[code.toLowerCase()];
}

/**
 * Get the display name for a language code
 * @param {string} code - ISO 639-1 language code
 * @returns {string} Language name or the code if not found
 */
function getLanguageName(code) {
  return SUPPORTED_LANGUAGES[code.toLowerCase()] || code;
}

// ========================================
// CORS CONFIGURATION
// ========================================

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

// Middleware - Add CORS and Private Network Access headers
app.use((req, res, next) => {
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
});

// ========================================
// RATE LIMITING
// ========================================

// Rate limiter configuration via environment variables
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000; // Default: 1 minute
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 30; // Default: 30 requests per window

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

// Apply rate limiting to all routes except /health
app.use(limiter);

app.use(express.json({ limit: '10mb' }));

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connected at:', res.rows[0].now);
  }
});

// ========================================
// API KEY VALIDATION
// ========================================

// Flag to track API key validity (set at startup)
let apiKeyValid = false;

/**
 * Validate Claude API key by making a minimal API call
 * Uses max_tokens: 1 to minimize cost (~$0.000001)
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

// Validate API key at startup (async, non-blocking)
validateApiKey().then(valid => {
  apiKeyValid = valid;
  if (!valid) {
    console.warn('⚠️  Server running with invalid/missing API key');
    console.warn('   Claude-dependent endpoints will return 503');
  }
});

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

// ========================================
// INPUT VALIDATION MIDDLEWARE
// ========================================

// Maximum text length configurable via environment (default: 50000 chars)
const MAX_TEXT_LENGTH = parseInt(process.env.MAX_TEXT_LENGTH) || 50000;

/**
 * Helper: Sanitize string input
 * Trims whitespace and removes null bytes
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/\0/g, '');
}

/**
 * Helper: Check if string contains HTML tags or script content
 */
function containsHtmlOrScript(str) {
  if (typeof str !== 'string') return false;
  // Check for HTML tags
  const htmlPattern = /<[^>]*>/;
  // Check for common script injection patterns
  const scriptPattern = /(javascript:|on\w+=|<script)/i;
  return htmlPattern.test(str) || scriptPattern.test(str);
}

/**
 * Middleware: Validate POST /analyze requests
 */
function validateAnalyzeRequest(req, res, next) {
  const { text } = req.body;

  // Check text exists and is a string
  if (!text || typeof text !== 'string') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Text field is required and must be a string'
    });
  }

  const trimmedText = text.trim();

  // Check minimum length (10 chars)
  if (trimmedText.length < 10) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Text must be at least 10 characters long'
    });
  }

  // Check maximum length
  if (trimmedText.length > MAX_TEXT_LENGTH) {
    return res.status(400).json({
      error: 'Bad Request',
      message: `Text too long. Maximum ${MAX_TEXT_LENGTH} characters allowed (received ${trimmedText.length})`
    });
  }

  // Check text contains actual words (not just whitespace/symbols)
  const wordPattern = /[a-zA-Z\u00C0-\u024F]{2,}/; // At least one word with 2+ letters (including accented chars)
  if (!wordPattern.test(trimmedText)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Text must contain actual words, not just symbols or whitespace'
    });
  }

  next();
}

/**
 * Middleware: Validate POST /define requests
 */
function validateDefineRequest(req, res, next) {
  const { word } = req.body;

  // Check word exists and is a string
  if (!word || typeof word !== 'string') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Word field is required and must be a string'
    });
  }

  const trimmedWord = word.trim();

  // Check minimum length (1 char)
  if (trimmedWord.length < 1) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Word cannot be empty'
    });
  }

  // Check maximum length (100 chars)
  if (trimmedWord.length > 100) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Word too long. Maximum 100 characters allowed'
    });
  }

  // Check for HTML tags or script content
  if (containsHtmlOrScript(trimmedWord)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Word contains invalid characters (HTML or script content not allowed)'
    });
  }

  next();
}

/**
 * Middleware: Validate POST /deck/add requests
 */
function validateDeckRequest(req, res, next) {
  const { userId, word, translation, contextSentence } = req.body;

  // Check userId is present
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'userId is required and must be a string'
    });
  }

  // Check word is present
  if (!word || typeof word !== 'string') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Word is required and must be a string'
    });
  }

  // Sanitize string inputs
  req.body.userId = sanitizeString(userId);
  req.body.word = sanitizeString(word);
  if (translation) req.body.translation = sanitizeString(translation);
  if (contextSentence) req.body.contextSentence = sanitizeString(contextSentence);

  // Validate word doesn't contain malicious content
  if (containsHtmlOrScript(req.body.word)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Word contains invalid characters'
    });
  }

  next();
}

// Utility: Calculate SHA-256 hash (secure hashing)
// Note: Upgraded from MD5 to SHA-256 to prevent collision attacks
function calculateHash(text) {
  return crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
}

// Local embedding model (lazy-loaded)
let embedder = null;

// Utility: Generate embedding locally using transformers
async function generateEmbedding(text) {
  try {
    // Lazy load the model (only once, ~5 seconds first time)
    if (!embedder) {
      console.log('📥 Loading local embedding model (one-time setup)...');
      try {
        const { pipeline } = await import('@xenova/transformers');
        embedder = await pipeline('feature-extraction', 'Xenova/multilingual-e5-base', {
          quantized: true  // Use quantized model for faster loading & less memory
        });
        console.log('✅ Embedding model loaded');
      } catch (importError) {
        console.error('❌ Failed to load embedding model (will skip similarity search):', importError.message);
        embedder = 'disabled'; // Mark as disabled to prevent retry
        return null;
      }
    }

    // If embedder was disabled due to previous error, skip
    if (embedder === 'disabled') {
      return null;
    }

    // Generate embedding (~300ms)
    const output = await embedder(text.substring(0, 512), {
      pooling: 'mean',
      normalize: true
    });

    // Convert to array (768 dimensions)
    return Array.from(output.data);
  } catch (error) {
    console.error('❌ Local embedding generation failed:', error.message);
    return null;
  }
}

// Utility: Find similar articles using vector similarity
async function findSimilarArticles(embedding, similarityThreshold = 0.85, limit = 5) {
  try {
    const embeddingString = JSON.stringify(embedding);

    const result = await pool.query(
      `SELECT
         url,
         title,
         cefr_level,
         word_count,
         text_preview,
         1 - (embedding <=> $1::vector) as similarity,
         analyzed_at
       FROM article_embeddings
       WHERE 1 - (embedding <=> $1::vector) > $2
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      [embeddingString, similarityThreshold, limit]
    );

    return result.rows;
  } catch (error) {
    console.error('❌ Similarity search failed:', error.message);
    return [];
  }
}

// Utility: Smart text sampling
function smartSample(text, maxWords = 800) {
  const words = text.split(/\s+/);

  if (words.length <= maxWords) {
    return { text, sampled: false, originalLength: words.length };
  }

  // Sample strategy: First 40% + Middle 20% + Last 40%
  const first = Math.floor(maxWords * 0.4);
  const middle = Math.floor(maxWords * 0.2);
  const last = Math.floor(maxWords * 0.4);

  const startSection = words.slice(0, first).join(' ');
  const midStart = Math.floor((words.length - middle) / 2);
  const midSection = words.slice(midStart, midStart + middle).join(' ');
  const endSection = words.slice(-last).join(' ');

  return {
    text: `${startSection}\n...\n${midSection}\n...\n${endSection}`,
    sampled: true,
    originalLength: words.length,
    sampledLength: maxWords
  };
}

// Utility: Log usage
async function logUsage(action, language, cacheHit, tokensUsed = 0, costUsd = 0) {
  if (!process.env.ENABLE_ANALYTICS) return;

  try {
    await pool.query(
      'INSERT INTO usage_log (action, language, cache_hit, tokens_used, cost_usd) VALUES ($1, $2, $3, $4, $5)',
      [action, language, cacheHit, tokensUsed, costUsd]
    );
  } catch (err) {
    console.error('Failed to log usage:', err.message);
  }
}

// ========================================
// ENDPOINT: Health Check
// ========================================
app.get('/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW()');
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      apiKeyConfigured: !!process.env.CLAUDE_API_KEY,
      apiKeyValid: apiKeyValid,
      database: 'connected',
      caching: process.env.ENABLE_CACHING === 'true'
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      apiKeyValid: apiKeyValid,
      database: 'disconnected',
      error: err.message
    });
  }
});

// ========================================
// ENDPOINT: Supported Languages
// ========================================
app.get('/languages', (req, res) => {
  res.json({
    languages: SUPPORTED_LANGUAGES,
    total: Object.keys(SUPPORTED_LANGUAGES).length,
    default: 'fr'
  });
});

// ========================================
// ENDPOINT: CEFR Analysis (Optimized)
// ========================================
app.post('/analyze', validateAnalyzeRequest, requireValidApiKey, async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('📥 POST /analyze');
    console.log('Time:', new Date().toISOString());

    const { text, url = null, useCache = true } = req.body;

    // Smart sampling
    const sampled = smartSample(text, parseInt(process.env.MAX_TEXT_WORDS) || 800);
    console.log(`📄 Text: ${sampled.originalLength} words → ${sampled.sampledLength || sampled.originalLength} words (sampled: ${sampled.sampled})`);

    // Calculate hash
    const textHash = calculateHash(sampled.text);
    console.log(`🔑 Hash: ${textHash}`);

    // Check cache
    if (useCache && process.env.ENABLE_CACHING === 'true') {
      const cacheResult = await pool.query(
        'SELECT * FROM analyses WHERE text_hash = $1',
        [textHash]
      );

      if (cacheResult.rows.length > 0) {
        console.log('💾 Cache HIT!');
        const cached = cacheResult.rows[0];

        // Update hit count and last accessed
        await pool.query(
          'UPDATE analyses SET hit_count = hit_count + 1, last_accessed = NOW() WHERE text_hash = $1',
          [textHash]
        );

        await logUsage('analyze', cached.language, true, 0, 0);

        return res.json({
          cefr_level: cached.cefr_level,
          confidence: cached.confidence,
          vocabulary_examples: cached.vocabulary_examples,
          grammar_features: cached.grammar_features,
          reasoning: cached.reasoning,
          cached: true,
          hit_count: cached.hit_count + 1
        });
      }
      console.log('💾 Hash cache MISS');

      // Tier 2: Check semantic similarity with local embeddings
      console.log('🔍 Generating local embedding for similarity search...');
      const embedding = await generateEmbedding(sampled.text);

      if (embedding) {
        const similarArticles = await findSimilarArticles(embedding, 0.90, 1);  // 90% similarity threshold

        if (similarArticles.length > 0) {
          const similar = similarArticles[0];
          console.log(`✅ VECTOR SIMILARITY HIT! (${(similar.similarity * 100).toFixed(1)}% similar to "${similar.url}")`);
          console.log(`   Returning cached CEFR: ${similar.cefr_level}`);

          // Update access count
          await pool.query(
            'UPDATE article_embeddings SET access_count = access_count + 1, last_accessed = NOW() WHERE url = $1',
            [similar.url]
          );

          await logUsage('analyze', 'fr', true, 0, 0);

          return res.json({
            cefr_level: similar.cefr_level,
            confidence: 'high',
            vocabulary_examples: [],
            grammar_features: [],
            reasoning: `Similar to previously analyzed article (${(similar.similarity * 100).toFixed(1)}% match)`,
            cached: true,
            cache_type: 'vector_similarity',
            similar_url: similar.url,
            similarity_score: similar.similarity
          });
        }
        console.log('❌ No similar articles found (< 90% similarity)');
      }
    }

    // Tier 3: Call AI API (full analysis)
    console.log('🤖 Calling AI API for full analysis...');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: `Assess CEFR level (A1-C2) of French text. Consider vocabulary complexity, grammar structures, sentence complexity.

French text:
${sampled.text}

Return JSON only:
{"cefr_level":"B2","confidence":"high","vocabulary_examples":["word1","word2","word3"],"grammar_features":["feature1","feature2"],"reasoning":"Brief explanation"}`
        }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ AI API error:', error);
      await logUsage('analyze', 'fr', false, 0, 0);
      return res.status(500).json({ error: 'Analysis service error' });
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Calculate cost
    const inputTokens = data.usage.input_tokens;
    const outputTokens = data.usage.output_tokens;
    const cost = (inputTokens * 0.80 + outputTokens * 4.00) / 1000000;

    console.log(`💰 Tokens: ${inputTokens} in + ${outputTokens} out = $${cost.toFixed(6)}`);

    // Parse JSON
    let result;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      result = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('❌ Failed to parse:', content);
      return res.status(500).json({ error: 'Failed to parse analysis' });
    }

    // Store in hash cache
    if (process.env.ENABLE_CACHING === 'true') {
      try {
        await pool.query(
          `INSERT INTO analyses (text_hash, url, language, cefr_level, confidence, vocabulary_examples, grammar_features, reasoning, word_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (text_hash) DO UPDATE SET
           hit_count = analyses.hit_count + 1,
           last_accessed = NOW()`,
          [textHash, url, 'fr', result.cefr_level, result.confidence,
           JSON.stringify(result.vocabulary_examples), JSON.stringify(result.grammar_features),
           result.reasoning, sampled.originalLength]
        );
        console.log('💾 Cached in hash table');
      } catch (err) {
        console.error('Cache storage failed:', err.message);
      }

      // Store local embedding for semantic similarity
      if (url) {
        try {
          console.log('🔮 Generating and storing local embedding...');
          const embedding = await generateEmbedding(sampled.text);

          if (embedding) {
            const urlHash = calculateHash(url);
            const textPreview = text.substring(0, 500);

            await pool.query(
              `INSERT INTO article_embeddings (url, url_hash, text_preview, embedding, cefr_level, word_count)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (url) DO UPDATE SET
                 embedding = EXCLUDED.embedding,
                 cefr_level = EXCLUDED.cefr_level,
                 word_count = EXCLUDED.word_count,
                 last_accessed = NOW()`,
              [url, urlHash, textPreview, JSON.stringify(embedding), result.cefr_level, sampled.originalLength]
            );
            console.log('🔮 Local embedding stored for future similarity matching');
          }
        } catch (err) {
          console.error('Embedding storage failed:', err.message);
        }
      }
    }

    await logUsage('analyze', 'fr', false, inputTokens + outputTokens, cost);

    console.log('✅ Analysis complete');
    console.log('========================================\n');

    res.json({ ...result, cached: false });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('========================================\n');
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// ========================================
// HELPER: Local Dictionary Lookup (FREE & INSTANT!)
// ========================================
async function lookupDictionary(word, language = 'fr') {
  try {
    console.log(`📚 Checking dictionaries for: "${word}"`);

    // Check frequency list dictionary first (5k words)
    const freqResult = await pool.query(
      'SELECT * FROM french_dictionary WHERE LOWER(word) = LOWER($1) LIMIT 1',
      [word.trim()]
    );

    if (freqResult.rows.length > 0) {
      const entry = freqResult.rows[0];
      console.log(`✅ Frequency dictionary HIT: "${word}" (${entry.part_of_speech})`);

      return {
        definition: entry.definition_en || entry.definition_fr || entry.translation,
        translation: entry.translation,
        type: entry.part_of_speech || 'unknown',
        example: null,
        source: 'frequency_dictionary',
        cefr: null
      };
    }

    // Check learned dictionary second (AI-learned words)
    const learnedResult = await pool.query(
      'SELECT * FROM learned_dictionary WHERE LOWER(word) = LOWER($1) LIMIT 1',
      [word.trim()]
    );

    if (learnedResult.rows.length > 0) {
      const entry = learnedResult.rows[0];
      console.log(`✅ Learned dictionary HIT: "${word}" (learned ${entry.learn_count}x)`);

      return {
        definition: entry.definition_en || entry.translation,
        translation: entry.translation,
        type: entry.part_of_speech || 'unknown',
        example: null,
        source: 'learned_dictionary',
        cefr: null
      };
    }

    console.log(`❌ Dictionary MISS: "${word}" (will call AI)`);
    return null;
  } catch (error) {
    console.error('❌ Dictionary error:', error.message);
    return null;
  }
}

// ========================================
// HELPER: AI Definition (Contextual)
// ========================================
async function getClaudeDefinition(word, context = '', language = 'fr') {
  console.log('🤖 Calling AI for contextual definition...');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Define French word "${word}"${context ? ` in context: "${context}"` : ''}. Provide the definition and translation in English. Return JSON:
{"definition":"... (in English)","translation":"... (in English)","cefr":"B2","type":"noun/verb/adj/adv/connector"}`
      }]
    })
  });

  if (!response.ok) {
    throw new Error('AI API error');
  }

  const data = await response.json();
  const content = data.content[0].text;

  const inputTokens = data.usage.input_tokens;
  const outputTokens = data.usage.output_tokens;
  const cost = (inputTokens * 0.80 + outputTokens * 4.00) / 1000000;

  console.log(`💰 AI call: ${inputTokens + outputTokens} tokens = $${cost.toFixed(6)}`);

  const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
  const result = JSON.parse(jsonText);

  return {
    ...result,
    source: 'ai',
    tokens: inputTokens + outputTokens,
    cost
  };
}

// ========================================
// ENDPOINT: Define Word (Dictionary-First Routing)
// ========================================
app.post('/define', validateDefineRequest, requireValidApiKey, async (req, res) => {
  try {
    const { word, context = '', language = 'fr', targetLanguage = 'en', forceAI = false } = req.body;

    console.log(`📖 Define: "${word}" (${language})`);

    // Step 1: Check vocabulary cache
    if (process.env.ENABLE_CACHING === 'true') {
      const cacheResult = await pool.query(
        'SELECT * FROM vocabulary_cache WHERE word = $1 AND language = $2',
        [word.toLowerCase(), language]
      );

      if (cacheResult.rows.length > 0) {
        console.log('💾 Vocabulary cache HIT');
        const cached = cacheResult.rows[0];
        await logUsage('define', language, true, 0, 0);
        return res.json({
          definition: cached.definition,
          translation: cached.translation,
          cefr: cached.cefr_level,
          type: cached.word_type,
          examples: cached.examples,
          source: 'cache',
          cached: true
        });
      }
    }

    let result;
    let tokens = 0;
    let cost = 0;

    // Step 2: Try dictionary first (FREE!) unless context requires AI or forceAI is true
    if (!context && !forceAI) {
      const dictResult = await lookupDictionary(word, language);
      if (dictResult) {
        result = dictResult;
        console.log('✅ Using dictionary definition (FREE!)');
      }
    }

    // Step 3: Fall back to AI if:
    // - Dictionary failed
    // - Context provided (needs contextual understanding)
    // - forceAI flag set
    if (!result) {
      const claudeResult = await getClaudeDefinition(word, context, language);
      result = claudeResult;
      tokens = claudeResult.tokens;
      cost = claudeResult.cost;

      // 🌱 Auto-populate learned_dictionary with AI's definition
      if (language === 'fr' && result.definition && result.translation) {
        try {
          await pool.query(
            `INSERT INTO learned_dictionary (word, translation, part_of_speech, definition_en)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (word) DO UPDATE SET
               learn_count = learned_dictionary.learn_count + 1`,
            [word.toLowerCase(), result.translation, result.type || 'unknown', result.definition]
          );
          console.log(`🌱 Added "${word}" to learned dictionary (from AI)`);
        } catch (err) {
          console.error('Learned dictionary auto-add failed:', err.message);
        }
      }
    }

    // Store in vocabulary cache
    if (process.env.ENABLE_CACHING === 'true') {
      try {
        await pool.query(
          `INSERT INTO vocabulary_cache (word, language, definition, translation, cefr_level, word_type)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (word, language) DO NOTHING`,
          [word.toLowerCase(), language, result.definition, result.translation, result.cefr, result.type]
        );
      } catch (err) {
        console.error('Vocabulary cache storage failed:', err.message);
      }
    }

    await logUsage('define', language, false, tokens, cost);

    res.json({
      definition: result.definition,
      translation: result.translation,
      cefr: result.cefr,
      type: result.type,
      example: result.example,
      source: result.source,
      cached: false
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// ========================================
// ENDPOINT: Batch Define (Optimized)
// ========================================
app.post('/define-batch', requireValidApiKey, async (req, res) => {
  try {
    const { words, language = 'fr' } = req.body;

    if (!words || !Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ error: 'Words array is required' });
    }

    console.log(`📚 Batch define: ${words.length} words`);

    const results = [];
    const uncachedWords = [];

    // Check cache for each word
    for (const wordObj of words) {
      const word = typeof wordObj === 'string' ? wordObj : wordObj.word;
      const cacheResult = await pool.query(
        'SELECT * FROM vocabulary_cache WHERE word = $1 AND language = $2',
        [word.toLowerCase(), language]
      );

      if (cacheResult.rows.length > 0) {
        const cached = cacheResult.rows[0];
        results.push({
          word,
          definition: cached.definition,
          translation: cached.translation,
          cefr: cached.cefr_level,
          type: cached.word_type,
          cached: true
        });
      } else {
        uncachedWords.push(wordObj);
      }
    }

    console.log(`💾 Cache: ${results.length} hits, ${uncachedWords.length} misses`);

    // Batch API call for uncached words
    if (uncachedWords.length > 0) {
      const wordsList = uncachedWords.map(w => typeof w === 'string' ? w : w.word).join(', ');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 800,
          messages: [{
            role: 'user',
            content: `Define these French words: ${wordsList}. Provide definitions and translations in English. Return JSON array:
[{"word":"word1","definition":"... (in English)","translation":"... (in English)","cefr":"B2","type":"noun"},...]`
          }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.content[0].text;

        const inputTokens = data.usage.input_tokens;
        const outputTokens = data.usage.output_tokens;
        const cost = (inputTokens * 0.80 + outputTokens * 4.00) / 1000000;

        console.log(`💰 Batch call: ${inputTokens + outputTokens} tokens = $${cost.toFixed(6)}`);

        try {
          const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\[[\s\S]*\]/);
          const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
          const batchResults = JSON.parse(jsonText);

          // Store in cache and learned dictionary, then add to results
          for (const item of batchResults) {
            // Store in vocabulary cache
            await pool.query(
              `INSERT INTO vocabulary_cache (word, language, definition, translation, cefr_level, word_type)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (word, language) DO NOTHING`,
              [item.word.toLowerCase(), language, item.definition, item.translation, item.cefr, item.type]
            );

            // Store in learned dictionary (if French)
            if (language === 'fr' && item.definition && item.translation) {
              await pool.query(
                `INSERT INTO learned_dictionary (word, translation, part_of_speech, definition_en)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (word) DO UPDATE SET
                   learn_count = learned_dictionary.learn_count + 1`,
                [item.word.toLowerCase(), item.translation, item.type || 'unknown', item.definition]
              );
            }

            results.push({ ...item, cached: false });
          }

          await logUsage('define-batch', language, false, inputTokens + outputTokens, cost);
        } catch (parseError) {
          console.error('❌ Failed to parse batch:', content);
        }
      }
    }

    res.json({ results, total: results.length });

  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// ========================================
// ENDPOINT: Add to Deck
// ========================================
app.post('/deck/add', validateDeckRequest, async (req, res) => {
  try {
    const {
      userId,
      word,
      phrase,
      contextSentence,
      translation,
      definition,
      cefrLevel,
      language = 'fr',
      sourceUrl,
      sourceTitle,
      tags = []
    } = req.body;

    const result = await pool.query(
      `INSERT INTO deck_cards
       (user_id, word, phrase, context_sentence, translation, definition, cefr_level, language, source_url, source_title, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [userId, word, phrase, contextSentence, translation, definition, cefrLevel, language, sourceUrl, sourceTitle, tags]
    );

    console.log(`✅ Added to deck: "${word}" for user ${userId}`);

    res.json({
      success: true,
      card: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error adding to deck:', error.message);
    res.status(500).json({ error: 'Failed to add to deck', message: error.message });
  }
});

// ========================================
// ENDPOINT: Get Deck
// ========================================
app.get('/deck/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    const result = await pool.query(
      'SELECT * FROM deck_cards WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM deck_cards WHERE user_id = $1',
      [userId]
    );

    res.json({
      cards: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('❌ Error fetching deck:', error.message);
    res.status(500).json({ error: 'Failed to fetch deck', message: error.message });
  }
});

// ========================================
// ENDPOINT: Delete from Deck
// ========================================
app.delete('/deck/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;

    const result = await pool.query(
      'DELETE FROM deck_cards WHERE id = $1 RETURNING *',
      [cardId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    console.log(`🗑️ Deleted card: ${cardId}`);

    res.json({ success: true, deleted: result.rows[0] });

  } catch (error) {
    console.error('❌ Error deleting card:', error.message);
    res.status(500).json({ error: 'Failed to delete card', message: error.message });
  }
});

// ========================================
// ENDPOINT: Export Deck
// ========================================
app.get('/deck/:userId/export', async (req, res) => {
  try {
    const { userId } = req.params;
    const { format = 'json' } = req.query;

    const result = await pool.query(
      'SELECT * FROM deck_cards WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    const cards = result.rows;

    if (format === 'csv') {
      // CSV export
      const csv = [
        'Word,Phrase,Context,Translation,Definition,CEFR Level,Language,Source URL,Created At',
        ...cards.map(c =>
          `"${c.word}","${c.phrase || ''}","${c.context_sentence || ''}","${c.translation || ''}","${c.definition || ''}","${c.cefr_level}","${c.language}","${c.source_url || ''}","${c.created_at}"`
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="deck-${userId}.csv"`);
      return res.send(csv);
    }

    if (format === 'anki') {
      // Anki-compatible CSV (Front, Back)
      const ankiCsv = [
        'Front,Back',
        ...cards.map(c => {
          const front = `${c.word}${c.phrase ? `<br><i>${c.phrase}</i>` : ''}`;
          const back = `${c.definition || ''}<br><br><b>Translation:</b> ${c.translation || ''}<br><b>Context:</b> ${c.context_sentence || ''}<br><b>Level:</b> ${c.cefr_level}`;
          return `"${front}","${back}"`;
        })
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="deck-${userId}-anki.csv"`);
      return res.send(ankiCsv);
    }

    // JSON export (default)
    res.json({
      userId,
      exportedAt: new Date().toISOString(),
      totalCards: cards.length,
      cards
    });

  } catch (error) {
    console.error('❌ Error exporting deck:', error.message);
    res.status(500).json({ error: 'Failed to export deck', message: error.message });
  }
});

// ========================================
// ENDPOINT: Generate Comprehension Questions
// ========================================
app.post('/questions/generate', requireValidApiKey, async (req, res) => {
  const { text, url, level, examType } = req.body;

  if (!text || !url || !level || !examType) {
    return res.status(400).json({ error: 'Missing required fields: text, url, level, examType' });
  }

  console.log('\n========================================');
  console.log('📝 POST /questions/generate');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Exam: ${examType} ${level}`);
  console.log(`URL: ${url}`);

  try {
    const urlHash = calculateHash(url);
    const textHash = calculateHash(text);

    // Check cache first
    const cached = await pool.query(
      `SELECT * FROM comprehension_questions
       WHERE url_hash = $1 AND level = $2 AND exam_type = $3
       LIMIT 1`,
      [urlHash, level, examType]
    );

    if (cached.rows.length > 0) {
      console.log('💾 CACHE HIT! Returning cached questions');

      // Update access count
      await pool.query(
        `UPDATE comprehension_questions
         SET access_count = access_count + 1, last_accessed = NOW()
         WHERE id = $1`,
        [cached.rows[0].id]
      );

      return res.json({
        questions: cached.rows[0].questions,
        questionSetId: cached.rows[0].id,
        cached: true,
        tokens: 0,
        cost: 0
      });
    }

    console.log('❌ CACHE MISS - Generating new questions with AI...');

    // Sample text if too long
    const { text: sampledText, sampled } = smartSample(text, 1000);
    console.log(`📄 Text: ${text.split(/\s+/).length} words → ${sampledText.split(/\s+/).length} words (sampled: ${sampled})`);

    // Call AI to generate questions
    const prompt = `Tu es un expert en création de questions de compréhension pour les examens ${examType} niveau ${level}.

Génère exactement 10 questions de compréhension basées sur ce texte français. Les questions doivent être variées et inclure différents types:
- Choix multiples (QCM) avec 4 options
- Vrai/Faux
- Questions à remplir (complément)
- Questions d'association (matching)
- Réponses courtes

Texte à analyser:
${sampledText}

IMPORTANT:
- Toutes les questions et explications doivent être en français
- Les questions doivent correspondre au niveau ${examType} ${level}
- Mélange les types de questions
- Fournis la bonne réponse et une explication pour chaque question

Format JSON requis:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Question ici?",
      "options": {
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      },
      "correct_answer": "B",
      "explanation": "Explication en français"
    },
    {
      "id": 2,
      "type": "true_false",
      "question": "Affirmation ici",
      "correct_answer": "Vrai",
      "explanation": "Explication"
    },
    {
      "id": 3,
      "type": "fill_blank",
      "question": "Le gouvernement a annoncé des _____ fiscales.",
      "correct_answer": "réductions",
      "explanation": "Explication"
    }
  ]
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('AI API error details:', JSON.stringify(errorData, null, 2));
      throw new Error(`AI API error: ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const questionsText = data.content[0].text;

    // Parse JSON response
    let questionsData;
    try {
      questionsData = JSON.parse(questionsText);
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = questionsText.match(/```json\n([\s\S]*?)\n```/) || questionsText.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        questionsData = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Failed to parse questions JSON from AI response');
      }
    }

    const tokens = data.usage.input_tokens + data.usage.output_tokens;
    const cost = (data.usage.input_tokens * 0.00025 + data.usage.output_tokens * 0.00125) / 1000;

    console.log(`💰 Tokens: ${data.usage.input_tokens} in + ${data.usage.output_tokens} out = $${cost.toFixed(6)}`);
    console.log(`✅ Generated ${questionsData.questions.length} questions`);

    // Store in database
    const insertResult = await pool.query(
      `INSERT INTO comprehension_questions
       (url, url_hash, article_text_hash, exam_type, level, questions, language)
       VALUES ($1, $2, $3, $4, $5, $6, 'fr')
       RETURNING id`,
      [url, urlHash, textHash, examType, level, JSON.stringify(questionsData.questions)]
    );

    const questionSetId = insertResult.rows[0].id;

    // Log usage
    await pool.query(
      `INSERT INTO usage_log (action, language, cache_hit, tokens_used, cost_usd)
       VALUES ($1, $2, $3, $4, $5)`,
      ['generate_questions', 'fr', false, tokens, cost]
    );

    res.json({
      questions: questionsData.questions,
      questionSetId,
      cached: false,
      tokens,
      cost: parseFloat(cost.toFixed(6))
    });

  } catch (error) {
    console.error('❌ Error generating questions:', error);
    res.status(500).json({ error: 'Failed to generate questions', message: error.message });
  }
});

// ========================================
// ENDPOINT: Add Questions to Deck
// ========================================
app.post('/questions/deck/add', async (req, res) => {
  const { userId, questionSetId, questions, level, examType, sourceUrl, sourceTitle, userScore } = req.body;

  if (!userId || !questionSetId || !questions) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    console.log(`💾 Adding question set to deck for user ${userId}`);

    await pool.query(
      `INSERT INTO comprehension_deck
       (user_id, question_set_id, question_data, level, exam_type, source_url, source_title, user_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, questionSetId, JSON.stringify(questions), level, examType, sourceUrl, sourceTitle, userScore]
    );

    res.json({ success: true, message: 'Questions added to deck' });

  } catch (error) {
    console.error('❌ Error adding to deck:', error);
    res.status(500).json({ error: 'Failed to add to deck', message: error.message });
  }
});

// ========================================
// ENDPOINT: Get User's Comprehension Deck
// ========================================
app.get('/questions/deck/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM comprehension_deck
       WHERE user_id = $1
       ORDER BY added_at DESC`,
      [userId]
    );

    res.json({
      sets: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('❌ Error fetching deck:', error);
    res.status(500).json({ error: 'Failed to fetch deck', message: error.message });
  }
});

// ========================================
// ENDPOINT: Export Comprehension Questions
// ========================================
app.get('/questions/deck/:userId/export', async (req, res) => {
  const { userId } = req.params;
  const { format } = req.query;

  try {
    const result = await pool.query(
      `SELECT * FROM comprehension_deck
       WHERE user_id = $1
       ORDER BY added_at DESC`,
      [userId]
    );

    if (format === 'anki') {
      // Anki CSV format
      let csv = 'Front,Back,Level,ExamType,Source\n';

      for (const set of result.rows) {
        const questions = JSON.parse(set.question_data);

        for (const q of questions) {
          let front = q.question;

          // Add options for multiple choice
          if (q.type === 'multiple_choice' && q.options) {
            front += '<br><br>';
            for (const [key, value] of Object.entries(q.options)) {
              front += `${key}. ${value}<br>`;
            }
          }

          let back = q.correct_answer;
          if (q.explanation) {
            back += `<br><br>${q.explanation}`;
          }

          const level = set.level || '';
          const examType = set.exam_type || '';
          const source = set.source_url || '';

          csv += `"${front}","${back}","${level}","${examType}","${source}"\n`;
        }
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="comprehension-deck-${userId}.csv"`);
      res.send(csv);

    } else {
      // JSON format
      res.json({
        deck_name: `French Comprehension - ${userId}`,
        total_sets: result.rows.length,
        sets: result.rows
      });
    }

  } catch (error) {
    console.error('❌ Error exporting deck:', error);
    res.status(500).json({ error: 'Failed to export deck', message: error.message });
  }
});

// ========================================
// ENDPOINT: Get Stats
// ========================================
app.get('/stats', async (req, res) => {
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

// Start server
app.listen(PORT, () => {
  console.log('\n========================================');
  console.log('🚀 Read & Learn Backend v2.0');
  console.log('========================================');
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Stats: http://localhost:${PORT}/stats`);
  console.log('');
  console.log('✅ Features:');
  console.log('  - CEFR Analysis (optimized prompts)');
  console.log('  - Word Definitions (micro-calls)');
  console.log('  - Batch Definitions (cost-effective)');
  console.log('  - Vocabulary Deck Builder');
  console.log('  - PostgreSQL Caching');
  console.log('  - Export (JSON/CSV/Anki)');
  console.log('');
  console.log(`💾 Caching: ${process.env.ENABLE_CACHING === 'true' ? 'ENABLED' : 'DISABLED'}`);
  console.log(`📊 Analytics: ${process.env.ENABLE_ANALYTICS === 'true' ? 'ENABLED' : 'DISABLED'}`);
  console.log(`📝 Max text: ${process.env.MAX_TEXT_WORDS || 800} words`);
  console.log(`🔒 CORS: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`🚦 Rate limit: ${RATE_LIMIT_MAX_REQUESTS} requests per ${RATE_LIMIT_WINDOW_MS / 1000}s`);
  console.log('========================================\n');
});
