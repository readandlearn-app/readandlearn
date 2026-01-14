# Technology Stack

**Analysis Date:** 2026-01-14

## Languages

**Primary:**
- JavaScript (ES6+) - All application code (`extension/*.js`, `translation-backend/server.js`)

**Secondary:**
- SQL - Database schema and queries (`translation-backend/init.sql`)

## Runtime

**Environment:**
- Node.js 20.x (Alpine in Docker) - `translation-backend/Dockerfile`
- Chrome/Chromium browser (extension target) - `extension/manifest.json`

**Package Manager:**
- npm
- Lockfile: `translation-backend/package-lock.json` present

## Frameworks

**Core:**
- Express.js 4.18.2 - REST API web framework (`translation-backend/package.json`)

**Testing:**
- Not implemented - No test framework currently configured

**Build/Dev:**
- Docker/Docker Compose - Container orchestration (`translation-backend/docker-compose.yml`)
- No build step required (vanilla JavaScript)

## Key Dependencies

**Critical:**
- @xenova/transformers 2.17.2 - Local ML embeddings for semantic similarity (`translation-backend/package.json`)
- pg 8.11.3 - PostgreSQL client driver (`translation-backend/package.json`)
- Claude AI (claude-haiku-4-5-20251001) - LLM for CEFR analysis and definitions

**Infrastructure:**
- cors 2.8.5 - Cross-origin resource sharing (`translation-backend/package.json`)
- dotenv 16.3.1 - Environment variable management (`translation-backend/package.json`)
- PostgreSQL 16 with pgvector - Database with vector similarity search

## Configuration

**Environment:**
- `.env` files with environment variables (`translation-backend/.env.example`)
- Required: `CLAUDE_API_KEY`
- Database: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Optional: `ENABLE_CACHING`, `ENABLE_ANALYTICS`, `MAX_TEXT_WORDS`, `VOYAGE_API_KEY`

**Build:**
- `translation-backend/docker-compose.yml` - Multi-service orchestration
- `translation-backend/Dockerfile` - Container configuration
- `extension/manifest.json` - Chrome extension manifest v3

## Platform Requirements

**Development:**
- macOS/Linux/Windows (any platform with Node.js and Docker)
- Chrome browser for extension testing
- PostgreSQL 16 (via Docker or local installation)

**Production:**
- Docker container for backend
- Chrome Web Store for extension distribution
- PostgreSQL 16 with pgvector extension

---

*Stack analysis: 2026-01-14*
*Update after major dependency changes*
