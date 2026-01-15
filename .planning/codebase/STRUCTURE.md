# Codebase Structure

**Analysis Date:** 2026-01-15

## Directory Layout

```
readandlearn/
├── extension/              # Chrome Extension (Manifest V3)
│   ├── modules/           # Feature modules (ES Modules)
│   └── lib/               # Third-party libraries (PDF.js)
├── translation-backend/    # Node.js Express Backend
│   ├── routes/            # HTTP endpoint handlers
│   ├── services/          # Business logic layer
│   ├── middleware/        # Express middleware
│   └── utils/             # Utility functions
├── .planning/             # Project planning documentation
│   ├── codebase/          # Codebase analysis (this folder)
│   ├── milestones/        # Milestone documentation
│   └── phases/            # Phase plans
├── README.md              # User documentation
├── LICENSE                # Apache 2.0
└── install.sh             # Installation script
```

## Directory Purposes

**extension/**
- Purpose: Chrome browser extension (frontend)
- Contains: Content scripts, background worker, UI modules, assets
- Key files:
  - `manifest.json` - Extension configuration (Manifest V3)
  - `background.js` - Service worker for message routing
  - `content.js` - Main orchestration script injected into pages
  - `options.html`, `options.js` - Extension settings UI
- Subdirectories:
  - `modules/` - Feature-specific ES modules
  - `lib/` - Third-party libraries (PDF.js)

**extension/modules/**
- Purpose: Modular extension functionality
- Contains: ES Module files for specific features
- Key files:
  - `api.js` - Backend API communication
  - `ui.js` - DOM manipulation and rendering (largest: 36KB)
  - `language.js` - Language detection and selection
  - `pdf.js` - PDF text extraction
  - `utils.js` - Shared utilities and constants
  - `design.js` - Design system tokens (colors, spacing, typography)
  - `DESIGN.md` - Design documentation

**translation-backend/**
- Purpose: Node.js Express API server
- Contains: All backend source code and configuration
- Key files:
  - `server.js` - Main entry point, Express initialization
  - `package.json` - npm dependencies and scripts
  - `Dockerfile` - Container configuration
  - `docker-compose.yml` - Multi-service orchestration
  - `init.sql` - PostgreSQL schema
  - `dictionary_migration.sql` - Dictionary table migration
  - `import_frequency_words.js` - Data import utility
  - `vitest.config.js` - Test configuration

**translation-backend/routes/**
- Purpose: HTTP route handlers
- Contains: Express router modules
- Key files:
  - `analyze.js` - POST /analyze (CEFR analysis)
  - `define.js` - POST /define, /define-batch (word definitions)
  - `deck.js` - CRUD for vocabulary decks
  - `questions.js` - Comprehension question generation
  - `health.js` - GET /health, /stats, /languages

**translation-backend/services/**
- Purpose: Reusable business logic
- Contains: Service modules with domain-specific functions
- Key files:
  - `claude.js` - Claude API integration, text hashing, smart sampling
  - `database.js` - PostgreSQL pool, vector similarity search, usage logging
  - `dictionary.js` - Local French dictionary lookups
  - `embeddings.js` - Local ML embeddings via Xenova Transformers

**translation-backend/middleware/**
- Purpose: Express middleware for cross-cutting concerns
- Contains: Middleware functions for request preprocessing
- Key files:
  - `cors.js` - CORS policy configuration
  - `rateLimit.js` - Rate limiting (express-rate-limit)
  - `apiKey.js` - API key validation
  - `validation.js` - Request body validation

**translation-backend/utils/**
- Purpose: Shared utility functions
- Contains: Validation, sanitization, constants
- Key files:
  - `validation.js` - Input validation, sanitization, supported languages
  - `validation.test.js` - Unit tests for validation utilities

## Key File Locations

**Entry Points:**
- `translation-backend/server.js` - Backend entry point
- `extension/manifest.json` - Extension configuration
- `extension/background.js` - Extension service worker
- `extension/content.js` - Content script orchestrator

**Configuration:**
- `translation-backend/.env.example` - Environment variable template
- `translation-backend/vitest.config.js` - Test configuration
- `translation-backend/docker-compose.yml` - Docker orchestration
- `translation-backend/railway.json` - Railway deployment config
- `translation-backend/render.yaml` - Render deployment config

**Core Logic:**
- `translation-backend/routes/analyze.js` - CEFR analysis with 3-tier caching
- `translation-backend/services/claude.js` - AI integration
- `translation-backend/services/embeddings.js` - Local ML embeddings
- `extension/modules/ui.js` - Extension UI rendering

**Database:**
- `translation-backend/init.sql` - Full schema with pgvector
- `translation-backend/dictionary_migration.sql` - Dictionary tables
- `translation-backend/services/database.js` - Database operations

**Testing:**
- `translation-backend/utils/validation.test.js` - Validation tests
- `translation-backend/vitest.config.js` - Test runner config

**Documentation:**
- `README.md` - User-facing installation and usage
- `extension/modules/DESIGN.md` - Extension design documentation
- `.planning/` - Project planning documentation

## Naming Conventions

**Files:**
- `kebab-case.js` - All JavaScript files (e.g., `rate-limit.js` would be `rateLimit.js`)
- `camelCase.js` - Current convention in codebase (e.g., `apiKey.js`, `rateLimit.js`)
- `*.test.js` - Test files alongside source
- `UPPERCASE.md` - Important documentation (README, LICENSE, DESIGN)

**Directories:**
- `kebab-case` - All directories (e.g., `translation-backend`)
- Plural for collections: `routes/`, `services/`, `modules/`

**Special Patterns:**
- `init.sql` - Database initialization
- `.env.example` - Environment template (never commit actual `.env`)
- `*.config.js` - Configuration files

## Where to Add New Code

**New API Endpoint:**
- Primary code: `translation-backend/routes/{endpoint-name}.js`
- Validation: Add middleware in `translation-backend/middleware/validation.js`
- Register route in `translation-backend/server.js`
- Tests: `translation-backend/routes/{endpoint-name}.test.js`

**New Service:**
- Implementation: `translation-backend/services/{service-name}.js`
- Export functions, use `init()` for dependency injection
- Tests: `translation-backend/services/{service-name}.test.js`

**New Extension Feature:**
- Module: `extension/modules/{feature}.js` (ES Module)
- Import in `extension/content.js`
- UI additions in `extension/modules/ui.js`

**New Middleware:**
- Implementation: `translation-backend/middleware/{middleware-name}.js`
- Add to middleware chain in `translation-backend/server.js`

**Utilities:**
- Shared helpers: `translation-backend/utils/`
- Extension utils: `extension/modules/utils.js`

## Special Directories

**.planning/**
- Purpose: Project planning and documentation
- Source: Created by GSD workflow
- Committed: Yes (documentation tracked in git)
- Subdirectories: `codebase/`, `milestones/`, `phases/`

**extension/lib/**
- Purpose: Third-party libraries for extension
- Contains: PDF.js minified files
- Source: Vendored from external source
- Committed: Yes (extension must bundle dependencies)

**translation-backend/node_modules/**
- Purpose: npm dependencies
- Source: `npm install`
- Committed: No (in `.gitignore`)

---

*Structure analysis: 2026-01-15*
*Update when directory structure changes*
