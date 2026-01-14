# Read & Learn

## What This Is

A self-hostable Chrome extension that helps language learners read authentic content in any EU CEFR language. It analyzes articles and PDFs for difficulty level, provides contextual word definitions, generates comprehension questions, and builds vocabulary decks — all with a readability-focused design that stays out of the way.

## Core Value

Production-ready, self-hostable infrastructure that anyone can deploy and use to learn languages by reading real content.

## Current State (v1.0)

**Shipped:** 2026-01-15

Production-ready MVP with:
- Multi-language CEFR analysis (24 EU languages)
- PDF support (local and online)
- Modular, testable codebase
- Design system with tokens and documentation
- One-click Railway/Render deployment
- Apache 2.0 license

**Tech Stack:**
- Chrome Extension MV3 with ES modules
- Node.js 20 / Express backend
- PostgreSQL 16 + pgvector
- Xenova transformers for local embeddings

**Codebase Stats:**
- Backend: 100-line server.js + modular routes/services
- Extension: 529-line content.js + 5 modules
- 66 files, ~6k net lines added

## Requirements

### Validated

<!-- Shipped and confirmed working in v1.0 -->

- ✓ French CEFR analysis with confidence levels and reasoning — existing
- ✓ Vocabulary deck management (add, view, delete, export to Anki/JSON) — existing
- ✓ Word definition lookup with dictionary + AI fallback — existing
- ✓ Comprehension question generation (DELF/DALF format) — existing
- ✓ Three-tier caching strategy (hash → embeddings → AI) — existing
- ✓ Chrome extension with draggable R/L button UI — existing
- ✓ Docker Compose deployment — existing
- ✓ Local ML embeddings via Xenova transformers — existing
- ✓ PostgreSQL with pgvector for semantic similarity — existing
- ✓ Multi-language support for all 24 EU CEFR languages — v1.0
- ✓ Auto-detect article language with manual override — v1.0
- ✓ PDF reading and analysis (local and online) — v1.0
- ✓ Configurable backend URLs (no hardcoded localhost) — v1.0
- ✓ Proper CORS and security (rate limiting, XSS mitigation) — v1.0
- ✓ Modular codebase with test foundation — v1.0
- ✓ Design system with centralized tokens — v1.0
- ✓ Railway and Render one-click deployment — v1.0
- ✓ Apache 2.0 license — v1.0

### Active

<!-- Next milestone scope -->

(No active requirements — v1.0 complete, awaiting user feedback for v1.1 scope)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Platform integration code — Auth and sync stay with closed-source platform
- Mobile apps or other browsers — Chrome extension only for v1
- Advanced features (spaced repetition algorithms, analytics dashboards) — Future scope
- Kubernetes deployment — Docker/PaaS sufficient for target audience
- Full documentation site — README + Docker setup is sufficient
- Video tutorials — Text docs are enough for now

## Context

**v1.0 Shipped:**
Self-hostable language learning extension with full EU language support, PDF capabilities, and one-click cloud deployment. Ready for user testing.

**Target Users:**
- Self-hosters: developers, language learners, educational institutions
- All need accessible setup (Docker Compose + one-click PaaS deploys)

## Constraints

- **Deployment**: Must work via Docker Compose — core requirement for self-hosting
- **License**: Apache 2.0 — permissive with patent protection
- **Branding**: Keep "Read & Learn" name and existing logo
- **Design**: Readability-first — non-intrusive UI, accessible typography, minimal visual noise
- **Stack**: Maintain Node.js/Express/PostgreSQL foundation — proven and working

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| All EU languages at once | User wants comprehensive multi-language support from start | ✓ Good |
| PDF support in v1 | Core to the "read & learn" value proposition | ✓ Good |
| Apache 2.0 license | Permissive with patent protection, better for adoption | ✓ Good |
| No auth in self-hosted | Auth complexity stays with platform, keeps OSS simple | ✓ Good |
| Railway + Render templates | One-click deploy for non-technical users | ✓ Good |
| Readability-focused design | Extension shouldn't distract from reading | ✓ Good |
| chrome.storage.sync for config | MV3 service workers can't use localStorage reliably | ✓ Good |
| ISO 639-1 language codes | Standard for web APIs, HTML lang, Accept-Language | ✓ Good |
| PDF.js v4.x not v5.x | v5.x requires Promise.withResolvers (newer Chrome only) | ✓ Good |
| Vitest over Jest | Modern ESM support, faster execution | ✓ Good |
| Dynamic imports for ES modules | MV3 content scripts use import(chrome.runtime.getURL()) | ✓ Good |
| Dependency injection via init() | Enables testing routes in isolation | ✓ Good |

---
*Last updated: 2026-01-15 after v1.0 milestone*
