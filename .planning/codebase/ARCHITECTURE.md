# Architecture

**Analysis Date:** 2026-01-15

## Pattern Overview

**Overall:** Client-Server Distributed System with Chrome Extension Frontend

**Key Characteristics:**
- Chrome extension (Manifest V3) + Node.js backend
- Service-oriented backend with dependency injection
- Three-tier intelligent caching (hash, semantic similarity, AI fallback)
- Cost-optimized AI integration with local ML embeddings

## Layers

**Frontend Layer (Chrome Extension):**
- Purpose: User interaction, content script injection, language detection
- Contains: UI rendering, PDF processing, API communication
- Location: `extension/`
- Depends on: Backend API for analysis and definitions
- Used by: End users via Chrome browser

**API Layer (Express Routes):**
- Purpose: HTTP request handling, input validation, response serialization
- Contains: Route handlers, request validation
- Location: `translation-backend/routes/`
- Depends on: Services layer, Middleware layer
- Used by: Frontend extension via fetch requests

**Services Layer:**
- Purpose: Core business logic, external API integration
- Contains: Claude API client, embeddings, dictionary, database operations
- Location: `translation-backend/services/`
- Depends on: Database, External APIs (Anthropic)
- Used by: Route handlers

**Middleware Layer:**
- Purpose: Cross-cutting concerns (auth, validation, rate limiting)
- Contains: API key validation, CORS, rate limiting, request validation
- Location: `translation-backend/middleware/`
- Depends on: Configuration
- Used by: Express router before route handlers

**Data Layer:**
- Purpose: Persistence, caching, similarity search
- Contains: PostgreSQL with pgvector for vector similarity
- Location: `translation-backend/services/database.js`, `translation-backend/init.sql`
- Depends on: PostgreSQL 16 + pgvector extension
- Used by: Services layer

## Data Flow

**CEFR Analysis Request:**

1. User selects text in browser
2. Extension detects language (`extension/modules/language.js`)
3. API request via background worker (`extension/background.js`)
4. POST /analyze received (`translation-backend/routes/analyze.js`)
5. Middleware validates input, checks API key
6. Three-tier cache lookup:
   - Hash cache (exact match) in `analyses` table
   - Vector similarity search via pgvector (90% threshold)
   - Claude API fallback if no cache hit
7. Response cached for future requests
8. Result returned with CEFR level, vocabulary, grammar features

**State Management:**
- File-based caching in PostgreSQL (analyses, article_embeddings tables)
- Chrome extension uses `localStorage` for user preferences
- User vocabulary stored in `deck_cards` table with user_id
- No in-memory state persistence between requests

## Key Abstractions

**Service:**
- Purpose: Encapsulate business logic for specific domains
- Examples: `translation-backend/services/claude.js`, `translation-backend/services/embeddings.js`, `translation-backend/services/dictionary.js`
- Pattern: Module exports with dependency injection via `init()` method

**Route Handler:**
- Purpose: HTTP endpoint implementation
- Examples: `translation-backend/routes/analyze.js`, `translation-backend/routes/define.js`, `translation-backend/routes/deck.js`
- Pattern: Express router with middleware chain, init() for dependencies

**Middleware:**
- Purpose: Request preprocessing and validation
- Examples: `translation-backend/middleware/validation.js`, `translation-backend/middleware/apiKey.js`, `translation-backend/middleware/rateLimit.js`
- Pattern: Express middleware function (req, res, next)

**Extension Module:**
- Purpose: Feature-specific functionality in extension
- Examples: `extension/modules/api.js`, `extension/modules/ui.js`, `extension/modules/language.js`
- Pattern: ES Module exports, imported by `extension/content.js`

## Entry Points

**Backend Entry:**
- Location: `translation-backend/server.js`
- Triggers: `npm start` or Docker container start
- Responsibilities: Initialize Express, configure middleware, inject dependencies, start HTTP server

**Extension Entry:**
- Location: `extension/manifest.json` (declares content script and background worker)
- Background: `extension/background.js` - Service worker for message routing
- Content: `extension/content.js` - Injected into web pages, orchestrates modules
- Triggers: User activates extension on a webpage

## Error Handling

**Strategy:** Try-catch with logging, graceful degradation

**Patterns:**
- Services throw errors with descriptive messages
- Routes catch errors, log to console, return JSON error response
- Caching failures are silent (operation continues without caching)
- Embedding failures disable embeddings gracefully (string flag 'disabled')
- Extension modules fail silently if imports fail

## Cross-Cutting Concerns

**Logging:**
- Console.log with emoji prefixes for visibility (e.g., `✅`, `❌`, `📥`)
- No external logging service configured
- Structured logging for cache hits/misses

**Validation:**
- `translation-backend/middleware/validation.js` - Input sanitization, HTML/script detection
- `translation-backend/utils/validation.js` - Reusable validation functions
- Validates at API boundary before processing

**Authentication:**
- API key validation via `translation-backend/middleware/apiKey.js`
- Validates CLAUDE_API_KEY against Anthropic API at startup
- No user authentication (anonymous extension users)

**Rate Limiting:**
- `translation-backend/middleware/rateLimit.js` using express-rate-limit
- Configurable via environment variables (default: 30 req/60s)

---

*Architecture analysis: 2026-01-15*
*Update when major patterns change*
