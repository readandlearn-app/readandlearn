# Read & Learn

## What This Is

A self-hostable Chrome extension that helps language learners read authentic content in any EU CEFR language. It analyzes articles and PDFs for difficulty level, provides contextual word definitions, generates comprehension questions, and builds vocabulary decks — all with a readability-focused design that stays out of the way.

## Core Value

Production-ready, self-hostable infrastructure that anyone can deploy and use to learn languages by reading real content.

## Requirements

### Validated

<!-- Shipped and confirmed valuable — existing functionality from brownfield codebase. -->

- ✓ French CEFR analysis with confidence levels and reasoning — existing
- ✓ Vocabulary deck management (add, view, delete, export to Anki/JSON) — existing
- ✓ Word definition lookup with dictionary + AI fallback — existing
- ✓ Comprehension question generation (DELF/DALF format) — existing
- ✓ Three-tier caching strategy (hash → embeddings → AI) — existing
- ✓ Chrome extension with draggable R/L button UI — existing
- ✓ Docker Compose deployment — existing
- ✓ Local ML embeddings via Xenova transformers — existing
- ✓ PostgreSQL with pgvector for semantic similarity — existing

### Active

<!-- Current scope. Building toward these. -->

**Multi-Language Support:**
- [ ] Expand beyond French to all EU CEFR languages
- [ ] Auto-detect article language with manual override option
- [ ] Language-specific frequency dictionaries

**PDF Support:**
- [ ] Read and analyze local PDF files
- [ ] Read and analyze online PDFs in browser
- [ ] PDF text extraction and CEFR analysis

**Production-Ready Infrastructure:**
- [ ] Remove hardcoded localhost URLs (configurable backend)
- [ ] Environment-based configuration for all settings
- [ ] Test coverage for critical paths
- [ ] Proper error handling and user feedback
- [ ] Fix security concerns (CORS, input validation, XSS)

**Deployment & Documentation:**
- [ ] Railway one-click deploy template
- [ ] Render one-click deploy template
- [ ] Updated README with deployment guide
- [ ] Docker setup documentation

**Design System:**
- [ ] Document existing color palette (purple gradient, CEFR colors)
- [ ] Document typography (Cinzel font, sizing)
- [ ] Component patterns and spacing guidelines
- [ ] Readability-focused design principles
- [ ] Accessibility guidelines (contrast, font sizes)

**Housekeeping:**
- [ ] Change license from AGPL-3.0 to Apache 2.0
- [ ] Split monolithic files (content.js, server.js) into modules

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Platform integration code — Auth and sync stay with closed-source platform
- Mobile apps or other browsers — Chrome extension only for v1
- Advanced features (spaced repetition algorithms, analytics dashboards) — Future scope
- Kubernetes deployment — Docker/PaaS sufficient for target audience
- Full documentation site — README + Docker setup is sufficient
- Video tutorials — Text docs are enough for now

## Context

**Existing Codebase:**
This is a brownfield project with a working French-only implementation. The codebase map in `.planning/codebase/` documents:
- Architecture: Two-tier client-server (Chrome Extension + Express API)
- Stack: JavaScript, Node.js 20, Express, PostgreSQL 16 + pgvector
- Key innovation: Three-tier caching reduces AI API costs by ~80%

**Technical Debt (from CONCERNS.md):**
- Hardcoded `localhost:3000` URLs need configuration
- Monolithic files (content.js: 1813 lines, server.js: 1237 lines)
- No test coverage
- XSS concerns with innerHTML usage
- Overly permissive CORS configuration

**Target Users:**
- Self-hosters: developers, language learners, educational institutions
- All need accessible setup (Docker Compose + one-click PaaS deploys)

**Current State:**
- Only the creator using it currently
- Free to make breaking changes
- No migration concerns

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
| All EU languages at once | User wants comprehensive multi-language support from start | — Pending |
| PDF support in v1 | Core to the "read & learn" value proposition | — Pending |
| Apache 2.0 license | Permissive with patent protection, better for adoption | — Pending |
| No auth in self-hosted | Auth complexity stays with platform, keeps OSS simple | — Pending |
| Railway + Render templates | One-click deploy for non-technical users | — Pending |
| Readability-focused design | Extension shouldn't distract from reading | — Pending |

---
*Last updated: 2026-01-14 after initialization*
