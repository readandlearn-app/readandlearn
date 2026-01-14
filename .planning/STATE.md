# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-14)

**Core value:** Production-ready, self-hostable infrastructure that anyone can deploy and use to learn languages by reading real content.
**Current focus:** Phase 3 — PDF Reading in progress

## Current Position

Phase: 3 of 7 (PDF Reading)
Plan: 1 of 2 in current phase
Status: In progress
Last activity: 2026-01-14 — Completed 03-01-PLAN.md

Progress: █████░░░░░ 36%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: 16 min
- Total execution time: 1.27 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 2/2 | 48 min | 24 min |
| 2 | 2/2 | 26 min | 13 min |
| 3 | 1/2 | 2 min | 2 min |

**Recent Trend:**
- Last 5 plans: 01-02 (42 min), 02-01 (3 min), 02-02 (23 min), 03-01 (2 min)
- Trend: Phase 3 in progress - PDF.js integrated

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

### Deferred Issues

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-14T20:22:59Z
Stopped at: Completed 03-01-PLAN.md (PDF.js Setup + Text Extraction)
Resume file: None
