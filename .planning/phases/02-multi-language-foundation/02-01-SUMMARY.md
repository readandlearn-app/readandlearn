---
phase: 02-multi-language-foundation
plan: 01
subsystem: api
tags: [multilingual, cefr, claude-api, i18n, iso-639-1]

# Dependency graph
requires:
  - phase: 01-production-infrastructure
    provides: Input validation middleware, API key validation, CORS configuration
provides:
  - SUPPORTED_LANGUAGES constant with 24 EU languages
  - isValidLanguage() and getLanguageName() helpers
  - GET /languages endpoint
  - Language-parameterized CEFR analysis
  - Language-parameterized word definitions
affects: [extension-ui, 02-02-extension-language-detection]

# Tech tracking
tech-stack:
  added: []
  patterns: [dynamic-prompt-templating, language-code-normalization]

key-files:
  created: []
  modified: [translation-backend/server.js]

key-decisions:
  - "Use ISO 639-1 two-letter codes for language identification"
  - "French dictionary remains as optimization; other languages use Claude directly"
  - "Language defaults to 'fr' for backward compatibility"

patterns-established:
  - "Language normalization: always lowercase before use"
  - "Dynamic prompt templating: ${languageName} in Claude prompts"

issues-created: []

# Metrics
duration: 3min
completed: 2026-01-14
---

# Phase 2 Plan 01: Backend Language Generalization Summary

**Generalized all CEFR endpoints to support 24 EU languages via dynamic Claude prompts, with French dictionary optimization preserved**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-14T19:31:58Z
- **Completed:** 2026-01-14T19:35:21Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments
- Added SUPPORTED_LANGUAGES constant with all 24 EU CEFR language codes and names
- Created GET /languages endpoint for client enumeration
- Generalized /analyze endpoint to accept language parameter and use dynamic prompts
- Generalized /define and /define-batch endpoints for any supported language
- French dictionary lookup preserved as free/instant optimization

## Task Commits

Each task was committed atomically:

1. **Task 1: Create language configuration and validation** - `3566d4a` (feat)
2. **Task 2: Generalize CEFR analysis prompt** - `f1ccb6b` (feat)
3. **Task 3: Generalize definition prompts** - `011f8b7` (feat)

## Files Created/Modified
- `translation-backend/server.js` - Added language config, helpers, /languages endpoint, and updated all CEFR prompts

## Decisions Made
- ISO 639-1 codes (two-letter): Standard for web APIs, HTML lang attributes, Accept-Language headers
- French dictionary optimization retained: 5k-word dictionary provides free lookups for most common French vocabulary
- Backward compatible: All endpoints default to 'fr' if no language specified
- Normalization: Language codes lowercased before comparison/storage

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness
- Backend now accepts language parameter on all CEFR-related endpoints
- Ready for 02-02-PLAN.md (Extension language detection and UI)
- Extension needs to detect article language and pass to backend

---
*Phase: 02-multi-language-foundation*
*Completed: 2026-01-14*
