// Read & Learn Backend Server v2.0
// Thin orchestration layer - business logic in services/, routes/, middleware/
require('dotenv').config();
const express = require('express');

// Middleware
const { corsMiddleware, ALLOWED_ORIGINS } = require('./middleware/cors');
const { limiter, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } = require('./middleware/rateLimit');
const { initApiKeyValidation, getApiKeyValid, requireValidApiKey } = require('./middleware/apiKey');
const { validateAnalyzeRequest, validateDefineRequest, validateDeckRequest } = require('./middleware/validation');

// Services
const { pool, testConnection, findSimilarArticles, logUsage } = require('./services/database');
const { generateEmbedding } = require('./services/embeddings');
const { lookupDictionary, init: initDictionary } = require('./services/dictionary');
const { calculateHash, smartSample, getClaudeDefinition, getLanguageName } = require('./services/claude');

// Validation utilities
const { SUPPORTED_LANGUAGES } = require('./utils/validation');

// Routes
const healthRoutes = require('./routes/health');
const analyzeRoutes = require('./routes/analyze');
const defineRoutes = require('./routes/define');
const deckRoutes = require('./routes/deck');
const questionsRoutes = require('./routes/questions');

// Initialize services
initDictionary(pool);

// Consolidated services object for route injection
const services = {
  calculateHash,
  smartSample,
  generateEmbedding,
  findSimilarArticles,
  logUsage,
  lookupDictionary,
  getClaudeDefinition,
  getLanguageName
};

// Consolidated middleware object for route injection
const middleware = {
  validateAnalyzeRequest,
  validateDefineRequest,
  validateDeckRequest,
  requireValidApiKey
};

// Initialize routes with dependencies
healthRoutes.init({ pool, getApiKeyValid, SUPPORTED_LANGUAGES });
analyzeRoutes.init({ pool, services, middleware });
defineRoutes.init({ pool, services, middleware });
deckRoutes.init({ pool, middleware });
questionsRoutes.init({ pool, services, middleware });

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Apply middleware
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(limiter);

// Mount routes
app.use(healthRoutes.router);
app.use(analyzeRoutes.router);
app.use(defineRoutes.router);
app.use(deckRoutes.router);
app.use(questionsRoutes.router);

// Startup
testConnection();
initApiKeyValidation();

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
