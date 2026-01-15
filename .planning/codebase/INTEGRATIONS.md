# External Integrations

**Analysis Date:** 2026-01-15

## APIs & External Services

**AI/LLM Provider:**
- Anthropic Claude API - CEFR analysis, word definitions, comprehension questions
  - SDK/Client: Native fetch to `https://api.anthropic.com/v1/messages`
  - Auth: `CLAUDE_API_KEY` environment variable
  - Model: `claude-haiku-4-5-20251001`
  - Endpoints used: Messages API (POST /v1/messages)
  - Files: `translation-backend/services/claude.js`, `translation-backend/routes/analyze.js`, `translation-backend/routes/define.js`, `translation-backend/routes/questions.js`

**Payment Processing:**
- Not detected

**Email/SMS:**
- Not detected

**External APIs:**
- None besides Anthropic Claude API

## Data Storage

**Databases:**
- PostgreSQL 16 with pgvector extension - Primary data store
  - Connection: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` env vars
  - Client: `pg` package (node-postgres) v8.11.3
  - Pool: `translation-backend/services/database.js`
  - Schema: `translation-backend/init.sql`
  - Migrations: `translation-backend/dictionary_migration.sql`
  - Tables:
    - `analyses` - CEFR analysis cache (hash-based)
    - `article_embeddings` - Vector embeddings for similarity (768-dim)
    - `deck_cards` - User vocabulary cards
    - `deck_stats` - User statistics
    - `vocabulary_cache` - Word definition cache
    - `learned_dictionary` - AI-learned words
    - `french_dictionary` - Frequency word list (5000 words)
    - `comprehension_questions` - Generated exam questions
    - `comprehension_deck` - User's saved question sets
    - `usage_log` - Analytics tracking

**File Storage:**
- Local filesystem only (no cloud storage)
- Extension uses Chrome storage API (`chrome.storage.sync`)

**Caching:**
- PostgreSQL-based caching (no Redis)
- In-memory caching via module-level variables
- Browser localStorage for extension preferences

## Authentication & Identity

**Auth Provider:**
- No user authentication (anonymous extension users)
- API key validation for backend access only

**Backend API Key:**
- `CLAUDE_API_KEY` validated at startup and per-request
- Middleware: `translation-backend/middleware/apiKey.js`
- Validates against Anthropic API before accepting requests

**OAuth Integrations:**
- Not detected

## Monitoring & Observability

**Error Tracking:**
- Console logging only
- No external error tracking (Sentry, etc.)

**Analytics:**
- Built-in usage tracking via `usage_log` table
- Tracks: action, language, cache_hit, tokens_used, cost_usd
- Feature flag: `ENABLE_ANALYTICS` environment variable
- File: `translation-backend/services/database.js` (logUsage function)

**Logs:**
- stdout/stderr only
- No external logging service

## CI/CD & Deployment

**Hosting:**
- Docker container-based deployment
- Deployment platforms configured:
  - Railway.app (`translation-backend/railway.json`)
  - Render.com (`translation-backend/render.yaml`)
  - Any Docker host

**CI Pipeline:**
- Not detected (no .github/workflows/)
- Tests run manually via `npm test`

**Container:**
- Dockerfile: `translation-backend/Dockerfile` (Node.js 20 Alpine)
- Docker Compose: `translation-backend/docker-compose.yml`
- Images: `pgvector/pgvector:pg16` for PostgreSQL

## Environment Configuration

**Development:**
- Required env vars:
  - `CLAUDE_API_KEY` (required)
  - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (if using DB)
- Secrets location: `.env` file (gitignored - use `.env.example` as template)
- Mock/stub services: None - uses real Anthropic API in dev

**Staging:**
- Not detected (single environment configuration)

**Production:**
- Secrets management: Environment variables via deployment platform
- Railway/Render both support environment variable configuration
- No separate staging environment

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## ML/AI Services

**Local Embeddings:**
- Xenova Transformers.js - Local ML embeddings generation
  - Model: `Xenova/multilingual-e5-base`
  - Dimensions: 768
  - Cost: FREE (runs locally)
  - File: `translation-backend/services/embeddings.js`
  - Usage: Article similarity matching, semantic caching

**Vector Database:**
- pgvector extension for PostgreSQL
  - HNSW index for fast similarity search
  - Cosine similarity metric
  - 768-dimensional vectors
  - Table: `article_embeddings`

## Browser/Extension APIs

**Chrome Extension APIs:**
- `chrome.runtime.sendMessage` - IPC between content and background
- `chrome.runtime.onMessage` - Message listener in background
- `chrome.storage.sync` - User preferences storage
- `chrome.action.onClicked` - Extension icon click handler
- `chrome.scripting.executeScript` - Dynamic script injection
- `chrome.i18n.detectLanguage` - Language detection
- Permissions: `activeTab`, `scripting`, `storage`

## Integration Architecture

```
Chrome Extension                Backend (Express)
      │                              │
      ├─ content.js                  ├─ /analyze
      │   │                          │   └─ Claude API
      │   └─ modules/api.js ────────►│   └─ PostgreSQL cache
      │                              │   └─ pgvector similarity
      │                              │
      ├─ background.js (IPC)         ├─ /define
      │                              │   └─ French dictionary
      │                              │   └─ Claude API (fallback)
      │                              │
      └─ chrome.storage              ├─ /deck/*
                                     │   └─ PostgreSQL (deck_cards)
                                     │
                                     └─ /questions/generate
                                         └─ Claude API
```

## Cost Considerations

**Anthropic Claude API:**
- Model: claude-haiku-4-5-20251001
- Input: $0.80 per million tokens
- Output: $4.00 per million tokens
- Caching reduces costs significantly (3-tier strategy)

**Database:**
- PostgreSQL - Self-hosted or platform-provided
- Railway/Render include free tier PostgreSQL

**Embeddings:**
- Local generation - FREE (Xenova Transformers)
- No external embedding API costs

---

*Integration audit: 2026-01-15*
*Update when adding/removing external services*
