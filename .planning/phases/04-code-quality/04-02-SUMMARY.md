---
phase: 04-code-quality
plan: 02
subsystem: backend
tags: [modularization, express, routes, services, middleware, nodejs]

# Dependency graph
requires:
  - phase: 04-01
    provides: Vitest test framework, validation utilities
provides:
  - Modular Express architecture (routes/services/middleware)
  - Server.js reduced from 1581 to 100 lines (93% reduction)
  - Dependency injection pattern for testability
affects: [04-03-extension-modularization]

# Tech tracking
tech-stack:
  patterns:
    - "Express Router for route isolation"
    - "Dependency injection via init() functions"
    - "Service layer for business logic"
    - "Middleware extraction for cross-cutting concerns"

key-files:
  created:
    - translation-backend/routes/health.js
    - translation-backend/routes/analyze.js
    - translation-backend/routes/define.js
    - translation-backend/routes/deck.js
    - translation-backend/routes/questions.js
    - translation-backend/services/database.js
    - translation-backend/services/embeddings.js
    - translation-backend/services/dictionary.js
    - translation-backend/services/claude.js
    - translation-backend/middleware/cors.js
    - translation-backend/middleware/rateLimit.js
    - translation-backend/middleware/apiKey.js
    - translation-backend/middleware/validation.js
  modified:
    - translation-backend/server.js

key-decisions:
  - "Dependency injection via init() for testability"
  - "Services export pure functions, routes handle HTTP"
  - "Middleware grouped by concern (cors, rateLimit, apiKey, validation)"

patterns-established:
  - "Routes use express.Router() and export { router, init }"
  - "Services use dependency injection for database pool"
  - "Consolidated services/middleware objects for route injection"

issues-created: []

# Metrics
duration: 8min
completed: 2026-01-15
---

# Phase 4 Plan 02: Backend Modularization Summary

**Modularized server.js (1581→100 lines) into 5 route files, 4 service files, and 4 middleware files with dependency injection**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-15T20:38:51Z
- **Completed:** 2026-01-15T20:47:00Z
- **Tasks:** 3
- **Files created:** 13
- **Files modified:** 1

## Accomplishments

- Extracted 5 route modules (health, analyze, define, deck, questions) with express.Router()
- Created 4 service modules (database, embeddings, dictionary, claude) with pure functions
- Extracted 4 middleware modules (cors, rateLimit, apiKey, validation)
- Reduced server.js from 1581 lines to 100 lines (93% reduction)
- All 20 existing tests still pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract route handlers** - `7afef7e` (refactor)
2. **Task 2: Extract services** - `864509f` (refactor)
3. **Task 3: Extract middleware and wire up** - `7806feb` (refactor)

## Files Created/Modified

**Routes (5 files):**
- `routes/health.js` - /health, /languages, /stats endpoints
- `routes/analyze.js` - /analyze endpoint with CEFR analysis
- `routes/define.js` - /define and /define-batch endpoints
- `routes/deck.js` - /deck/* vocabulary deck endpoints
- `routes/questions.js` - /questions/* comprehension endpoints

**Services (4 files):**
- `services/database.js` - PostgreSQL pool, similarity search, usage logging
- `services/embeddings.js` - Local ML embedding generation with lazy loading
- `services/dictionary.js` - French dictionary lookup (frequency + learned)
- `services/claude.js` - Claude API calls, hashing, text sampling

**Middleware (4 files):**
- `middleware/cors.js` - CORS configuration with wildcard support
- `middleware/rateLimit.js` - Rate limiting configuration
- `middleware/apiKey.js` - Claude API key validation
- `middleware/validation.js` - Request validation middleware

**Modified:**
- `server.js` - Thin orchestration layer (1581→100 lines)

## Architecture

```
server.js (100 lines - orchestration only)
├── middleware/
│   ├── cors.js
│   ├── rateLimit.js
│   ├── apiKey.js
│   └── validation.js
├── services/
│   ├── database.js
│   ├── embeddings.js
│   ├── dictionary.js
│   └── claude.js
├── routes/
│   ├── health.js
│   ├── analyze.js
│   ├── define.js
│   ├── deck.js
│   └── questions.js
└── utils/
    └── validation.js (from 04-01)
```

## Decisions Made

- **Dependency injection via init():** Each route module exposes an init() function that receives its dependencies. This enables testing routes in isolation.
- **Services export pure functions:** Services don't know about HTTP - they just process data and return results.
- **Consolidated injection objects:** Rather than passing many individual dependencies, routes receive `{ pool, services, middleware }` objects.

## Deviations from Plan

None - plan executed as specified.

## Issues Encountered

None - clean extraction with all tests passing.

## Next Step

- Ready for 04-03: Extension Modularization (content.js 2294 lines → modules)

---
*Phase: 04-code-quality*
*Completed: 2026-01-15*
