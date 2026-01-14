# External Integrations

**Analysis Date:** 2026-01-14

## APIs & External Services

**AI/LLM - Anthropic Claude API:**
- Service: Language model for CEFR analysis, definitions, and question generation
- Model: claude-haiku-4-5-20251001 (cost-optimized)
- SDK/Client: REST API via native fetch
- Auth: API key in `CLAUDE_API_KEY` env var
- Endpoints used:
  - `https://api.anthropic.com/v1/messages`
- Implementation files:
  - `translation-backend/server.js` lines 278-299 (CEFR analysis)
  - `translation-backend/server.js` lines 450-466 (contextual definitions)
  - `translation-backend/server.js` lines 984-998 (question generation)
- Cost tracking: Token usage logged with cost calculation

**Email/SMS:**
- Not integrated

**Payment Processing:**
- Not integrated

## Data Storage

**Databases:**
- PostgreSQL 16 with pgvector extension
- Connection: via `DB_*` env vars (host, port, name, user, password)
- Client: pg 8.11.3 (`translation-backend/package.json`)
- Migrations: `translation-backend/init.sql`
- Docker image: `pgvector/pgvector:pg16`

**Database Tables:**
- `analyses` - CEFR analysis cache (hash-based)
- `article_embeddings` - Vector embeddings (768-dim) for semantic similarity
- `vocabulary_cache` - Word definition cache
- `deck_cards` - User vocabulary flashcards
- `deck_stats` - User statistics
- `french_dictionary` - 5k frequency words
- `learned_dictionary` - AI-learned words
- `comprehension_questions` - DELF/DALF practice questions
- `comprehension_deck` - User-saved question sets
- `usage_log` - API usage analytics

**File Storage:**
- Not integrated (no cloud storage)

**Caching:**
- PostgreSQL-based caching (no Redis)
- Three-tier strategy: hash → embedding similarity → API

## Local ML/Embeddings

**Xenova Transformers:**
- Service: Local embedding generation (FREE)
- Model: multilingual-e5-base (quantized)
- SDK/Client: @xenova/transformers 2.17.2
- Implementation: `translation-backend/server.js` lines 58-73
- Purpose: Generate 768-dim vectors for semantic similarity search

**Optional - Voyage AI:**
- Service: External embeddings API (not used by default)
- Auth: `VOYAGE_API_KEY` env var
- Status: Commented out in `.env.example`

## Authentication & Identity

**Auth Provider:**
- None - Uses localStorage browser fingerprinting for user ID
- Implementation: `extension/content.js` line 167
- Pattern: `localStorage.getItem('readandlearn_user_id')`

**OAuth Integrations:**
- Not integrated

## Monitoring & Observability

**Error Tracking:**
- None - Console logging only

**Analytics:**
- Internal `usage_log` table
- Tracks: action, language, cache_hit, tokens_used, cost_usd
- Implementation: `translation-backend/server.js` lines 150-161

**Logs:**
- Console output only (stdout/stderr)
- 126 console.log statements across codebase

## CI/CD & Deployment

**Hosting:**
- Docker container (backend)
- Chrome Web Store (extension)
- Deployment: Manual via Docker Compose

**CI Pipeline:**
- Not configured

## Environment Configuration

**Development:**
- Required env vars: `CLAUDE_API_KEY`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Secrets location: `.env` file (gitignored)
- Template: `translation-backend/.env.example`
- Local database: Docker PostgreSQL

**Staging:**
- Not configured

**Production:**
- Secrets: Environment variables
- Database: PostgreSQL with pgvector

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## External Resources

**Google Fonts:**
- Service: Web typography
- Resource: Cinzel font (weight 900)
- URL: `https://fonts.googleapis.com/css2?family=Cinzel:wght@900&display=swap`
- Implementation: `extension/content.js` line 92

## Integration Summary

| Service | Type | Auth Method | Used For |
|---------|------|-------------|----------|
| Claude API | REST API | API Key | CEFR analysis, definitions, questions |
| PostgreSQL | Database | Connection string | All persistent data |
| Xenova | Local library | None | Embedding generation |
| Google Fonts | CDN | None | UI typography |

---

*Integration audit: 2026-01-14*
*Update when adding/removing external services*
