# Technology Stack

**Analysis Date:** 2026-01-15

## Languages

**Primary:**
- JavaScript (ES6+) - All application code (backend and extension)

**Secondary:**
- SQL (PostgreSQL) - Database schema and queries (`translation-backend/init.sql`, `translation-backend/dictionary_migration.sql`)

## Runtime

**Environment:**
- Node.js 20.x (LTS) - Backend runtime (`translation-backend/Dockerfile`: FROM node:20-alpine)
- Chrome Extension Runtime - Manifest V3 (`extension/manifest.json`)

**Package Manager:**
- npm 10.x
- Lockfile: `translation-backend/package-lock.json` present

## Frameworks

**Core:**
- Express.js 4.18.2 - HTTP server and routing (`translation-backend/server.js`)

**Testing:**
- Vitest 4.0.17 - Unit testing (`translation-backend/vitest.config.js`)

**Build/Dev:**
- No build step required - Vanilla JavaScript (CommonJS backend, ES Modules extension)
- Docker - Containerization (`translation-backend/Dockerfile`, `translation-backend/docker-compose.yml`)

## Key Dependencies

**Critical:**
- `@xenova/transformers` 2.17.2 - Local ML embeddings generation (`translation-backend/services/embeddings.js`)
- `pg` 8.11.3 - PostgreSQL database driver (`translation-backend/services/database.js`)
- `express` 4.18.2 - HTTP server framework (`translation-backend/server.js`)

**Infrastructure:**
- `express-rate-limit` 8.2.1 - Rate limiting (`translation-backend/middleware/rateLimit.js`)
- `dotenv` 16.3.1 - Environment variable management (`translation-backend/server.js`)
- `cors` 2.8.5 - CORS middleware (custom implementation in `translation-backend/middleware/cors.js`)

**Extension:**
- PDF.js - PDF text extraction (`extension/lib/pdf.min.mjs`, `extension/lib/pdf.worker.min.mjs`)

## Configuration

**Environment:**
- `.env` files for configuration (`translation-backend/.env.example`)
- Key variables:
  - `CLAUDE_API_KEY` - Anthropic API authentication (required)
  - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - PostgreSQL connection
  - `PORT` - Server port (default: 3001)
  - `ENABLE_CACHING` - Feature flag for caching
  - `ENABLE_ANALYTICS` - Feature flag for usage tracking
  - `MAX_TEXT_WORDS` - Token optimization limit (default: 800)
  - `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS` - Rate limiting config
  - `ALLOWED_ORIGINS` - CORS configuration

**Build:**
- `translation-backend/vitest.config.js` - Test runner configuration
- `translation-backend/docker-compose.yml` - Multi-service orchestration

## Platform Requirements

**Development:**
- macOS/Linux/Windows (any platform with Node.js 20+)
- Docker for PostgreSQL with pgvector extension
- Chrome browser for extension testing

**Production:**
- Docker container deployment
- PostgreSQL 16 with pgvector extension
- Deployment platforms supported:
  - Railway.app (`translation-backend/railway.json`)
  - Render.com (`translation-backend/render.yaml`)
  - Any Docker host

---

*Stack analysis: 2026-01-15*
*Update after major dependency changes*
