# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-14)

**Core value:** Production-ready, self-hostable infrastructure that anyone can deploy and use to learn languages by reading real content.
**Current focus:** Phase 4 — Code Quality in progress

## Current Position

Phase: 4 of 7 (Code Quality)
Plan: 2 of 3 in current phase
Status: In progress
Last activity: 2026-01-15 — Completed 04-02-PLAN.md

Progress: ██████░░░░ 57%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 12 min
- Total execution time: 1.56 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 2/2 | 48 min | 24 min |
| 2 | 2/2 | 26 min | 13 min |
| 3 | 2/2 | 7 min | 3.5 min |
| 4 | 2/3 | 11 min | 5.5 min |

**Recent Trend:**
- Last 5 plans: 03-01 (2 min), 03-02 (5 min), 04-01 (3 min), 04-02 (8 min)
- Trend: Backend modularization complete, server.js reduced 93%

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

### Deferred Issues

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-15
Stopped at: Completed 04-02-PLAN.md (Backend Modularization)
Resume file: None
