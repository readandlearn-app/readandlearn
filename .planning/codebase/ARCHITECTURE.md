# Architecture

**Analysis Date:** 2026-01-14

## Pattern Overview

**Overall:** Client-Server Architecture (Chrome Extension + RESTful Backend)

**Key Characteristics:**
- Two-tier distributed architecture
- Chrome Extension (MV3) as client
- Node.js/Express REST API backend
- PostgreSQL with vector embeddings for intelligent caching
- Cost-optimized with three-tier caching strategy

## Layers

**Presentation Layer (Chrome Extension):**
- Purpose: UI rendering, user interaction, state management
- Contains: `extension/content.js` (1813 lines), `extension/background.js` (63 lines)
- Depends on: Backend API via message passing
- Used by: End users interacting with French articles

**API Layer (Express Server):**
- Purpose: HTTP request handling, CORS, routing
- Contains: Route handlers in `translation-backend/server.js`
- Depends on: Service functions, PostgreSQL pool
- Used by: Chrome extension via REST calls

**Service Layer (Embedded in server.js):**
- Purpose: Business logic for CEFR analysis, definitions, questions
- Contains: Functions like `calculateHash()`, `generateEmbedding()`, `smartSample()`, `lookupDictionary()`
- Depends on: PostgreSQL pool, Claude AI API, Xenova transformers
- Used by: API route handlers

**Data Access Layer:**
- Purpose: Persistent storage and caching
- Contains: PostgreSQL tables (analyses, deck_cards, vocabulary_cache, etc.)
- Depends on: pg Pool client
- Used by: Service layer functions

## Data Flow

**Article Analysis Flow:**

1. User clicks R/L button on page
2. Content script calls `detectArticle()` to find main content
3. `isFrench()` validates language
4. Extension sends request via `background.js` proxy (bypasses CORS)
5. Backend `POST /analyze` receives request
6. `smartSample()` reduces text to 800 words
7. `calculateHash()` creates SHA-256 for cache lookup
8. Check `analyses` table for exact match (Tier 1)
9. Check `article_embeddings` for 90% similarity (Tier 2)
10. If miss, call Claude AI for full CEFR analysis (Tier 3)
11. Store result and embedding for future cache hits
12. Return analysis to extension for display

**State Management:**
- localStorage: User ID, mode state, button position
- In-memory: currentAnalysis, currentQuestions, userAnswers
- Database: All persistent data (deck cards, questions, analytics)

## Key Abstractions

**Caching Strategy (Three-Tier):**
- Purpose: Minimize expensive AI API calls
- Tier 1: SHA-256 hash exact match (FREE, instant)
- Tier 2: Xenova embeddings + pgvector similarity search (FREE, fast)
- Tier 3: Claude AI API call (paid, fallback only)
- Pattern: Cost optimization through intelligent caching

**Dictionary Lookup:**
- Purpose: Word definition routing
- Pattern: Dictionary-First approach (free before paid)
- Flow: vocabulary_cache → french_dictionary → learned_dictionary → Claude AI
- Location: `translation-backend/server.js` lines 392-491

**API Proxy (Background Script):**
- Purpose: Bypass Chrome's Private Network Access restrictions
- Pattern: Message passing from content script to service worker
- Location: `extension/background.js` lines 4-39

## Entry Points

**Backend:**
- Location: `translation-backend/server.js`
- Triggers: HTTP requests on PORT (default 3000)
- Responsibilities: Express app initialization, route handling, database connection

**Extension Content Script:**
- Location: `extension/content.js`
- Triggers: Page load (injected via manifest) or icon click
- Responsibilities: UI rendering, user interaction, API communication

**Extension Background Worker:**
- Location: `extension/background.js`
- Triggers: chrome.runtime.onMessage, chrome.action.onClicked
- Responsibilities: API request proxying, content script injection

## Error Handling

**Strategy:** Try-catch at route boundaries with console logging

**Patterns:**
- Backend: HTTP status codes (400, 404, 500) with JSON error messages
- Frontend: showBanner() for user notifications
- Graceful fallbacks when embeddings unavailable
- Console logging with emoji prefixes for debugging

## Cross-Cutting Concerns

**Logging:**
- Console.log with emoji indicators throughout
- 126 log statements across codebase
- No structured logging framework

**Validation:**
- Basic input validation at API endpoints
- Missing comprehensive sanitization

**Caching:**
- Three-tier strategy (hash → embedding → API)
- usage_log table tracks cache hits and costs

---

*Architecture analysis: 2026-01-14*
*Update when major patterns change*
