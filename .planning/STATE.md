# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-14)

**Core value:** Production-ready, self-hostable infrastructure that anyone can deploy and use to learn languages by reading real content.
**Current focus:** PROJECT COMPLETE

## Current Position

Phase: 7 of 7 (Housekeeping)
Plan: 1 of 1 in current phase
Status: Complete
Last activity: 2026-01-15 — Completed 07-01-PLAN.md (License Change)

Progress: ██████████ 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 12
- Average duration: 8 min
- Total execution time: 1.9 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 2/2 | 48 min | 24 min |
| 2 | 2/2 | 26 min | 13 min |
| 3 | 2/2 | 7 min | 3.5 min |
| 4 | 3/3 | 16 min | 5.3 min |
| 5 | 2/2 | 6 min | 3 min |
| 6 | 1/1 | 4 min | 4 min |
| 7 | 1/1 | 3 min | 3 min |

**Final Summary:**
- All 7 phases complete
- All 12 plans executed successfully
- Project ready for release

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

| Plan | Decision | Rationale |
|------|----------|-----------|
| 01-01 | chrome.storage.sync for config | MV3 service workers can't use localStorage reliably |
| 01-01 | Dynamic CORS origin reflection | Access-Control-Allow-Credentials incompatible with * |
| 01-01 | Non-crashing API validation | Server stays up for health checks, 503 on Claude endpoints |
| 01-02 | Rate limit 30 req/min | Allows bursts while preventing abuse |
| 01-02 | Skip /health from rate limiting | Preserves monitoring capability |
| 01-02 | textContent for XSS | Inherently safe, no library needed |
| 01-02 | Default port 3001 | User request to avoid port conflict |
| 02-01 | ISO 639-1 two-letter codes | Standard for web APIs, HTML lang, Accept-Language |
| 02-01 | French dictionary optimization | Free lookups for 5k common words, Claude for rest |
| 02-01 | Language defaults to 'fr' | Backward compatibility with existing extension |
| 02-02 | chrome.i18n.detectLanguage() | Built-in CLD more accurate than word-list detection |
| 02-02 | localStorage for language override | Matches existing extension settings pattern |
| 02-02 | French fallback on detection failure | Backward compatibility when detection uncertain |
| 03-01 | PDF.js v4.x not v5.x | v5.x requires Promise.withResolvers (newer Chrome only) |
| 03-01 | Lazy load PDF.js | Avoid loading library on non-PDF pages |
| 03-01 | 50 page extraction limit | Prevent performance issues with large PDFs |
| 03-02 | analyzeContent() dispatcher | Single entry point for PDF vs article detection |
| 03-02 | 100 char minimum for PDF | Catch scanned/image-only PDFs with helpful error |
| 04-01 | Vitest over Jest | Modern ESM support, faster execution |
| 04-01 | Extract validation first | Simplest extraction target for test foundation |
| 04-02 | Dependency injection via init() | Enables testing routes in isolation |
| 04-02 | Services export pure functions | Services don't know about HTTP |
| 04-02 | Consolidated injection objects | Routes receive { pool, services, middleware } |
| 04-03 | Dynamic imports for ES modules | MV3 content scripts use import(chrome.runtime.getURL()) |
| 04-03 | 529 lines vs 150 target | State management code stayed in content.js for cohesion |
| 04-03 | ui.js consolidation | All UI rendering functions kept together for consistency |
| 05-01 | Flat CEFR object | COLORS.cefr.A1 pattern for simple level-based access |
| 05-02 | Co-located docs | DESIGN.md lives with design.js in modules/ |
| 06-01 | Dockerfile over buildpack | Both platforms use existing Dockerfile for consistency |
| 06-01 | Starter plans default | Affordable ~$5-7/month for self-hosted users |
| 07-01 | Apache 2.0 over AGPL | More enterprise-friendly, enables broader adoption |

### Deferred Issues

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-15
Stopped at: Completed 07-01-PLAN.md (License Change) — PROJECT COMPLETE
Resume file: None
