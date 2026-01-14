# Codebase Concerns

**Analysis Date:** 2026-01-14

## Tech Debt

**Monolithic Files:**
- Issue: `extension/content.js` is 1813 lines, `translation-backend/server.js` is 1237 lines
- Why: Rapid MVP development without modularization
- Impact: Hard to maintain, test, and reason about
- Fix approach: Split into logical modules (ui.js, api.js, state.js for extension; routes/, services/ for backend)

**Duplicated AI API Call Logic:**
- Issue: Claude API call pattern repeated 4 times in `translation-backend/server.js`
- Files: Lines 278-299, 450-466, 646-662, 984-998
- Why: Each feature added independently
- Impact: Changes to API handling require 4 updates
- Fix approach: Extract to shared `callClaudeAPI()` helper function

**Hardcoded Backend URL:**
- Issue: `const BACKEND_URL = 'http://localhost:3000'` in two files
- Files: `extension/background.js` line 1, `extension/content.js` line 34
- Why: Development convenience
- Impact: Cannot deploy to production without code changes
- Fix approach: Use configuration or environment-specific builds

## Known Bugs

**No critical bugs identified during analysis.**

## Security Considerations

**Overly Permissive CORS:**
- Risk: `Access-Control-Allow-Origin: *` allows any origin
- File: `translation-backend/server.js` line 13
- Current mitigation: None
- Recommendations: Restrict to Chrome extension origin

**Hardcoded Database Credentials:**
- Risk: Development password exposed in utility script
- File: `translation-backend/import_frequency_words.js` line 8 (`password: 'dev_password_123'`)
- Current mitigation: Script not used in production
- Recommendations: Use environment variables consistently

**XSS Vulnerability in innerHTML:**
- Risk: Dynamic HTML rendering without sanitization
- Files: `extension/content.js` lines 222-228, 1689-1696
- Current mitigation: Data comes from controlled sources
- Recommendations: Use DOM methods or sanitization library

**Missing Input Validation:**
- Risk: User selections and DOM text accepted without validation
- Files: `extension/content.js` lines 759-760, 854
- Current mitigation: None
- Recommendations: Validate text length and content type

## Performance Bottlenecks

**O(n) DOM Operations per Word:**
- Problem: `querySelectorAll('div')` called for every word highlight
- File: `extension/content.js` lines 606-612
- Measurement: Not profiled, but O(n) with many words
- Cause: TreeWalker created for each `highlightInElement()` call
- Improvement path: Single preprocessing pass, reuse walker

**Tooltip Memory Leak:**
- Problem: Event listeners added without removal, tooltips accumulated
- File: `extension/content.js` lines 1709-1746
- Measurement: Memory grows with highlighted words
- Cause: No cleanup when tooltips removed
- Improvement path: Track listeners, cleanup on word removal

**Embedding Model Lazy Load:**
- Problem: First request waits ~5 seconds for model load
- File: `translation-backend/server.js` lines 61-73
- Measurement: ~5s delay on first similarity check
- Cause: Lazy loading on first use
- Improvement path: Load model on server startup

## Fragile Areas

**Content Script Injection:**
- File: `extension/content.js` lines 27-32
- Why fragile: Global flag `readAndLearnInjected` unreliable with async navigation
- Common failures: Multiple injections in edge cases
- Safe modification: Add debounce or more robust detection
- Test coverage: None

**Selection Mode State:**
- File: `extension/content.js` multiple locations
- Why fragile: 11+ global variables managing state
- Common failures: State inconsistency after errors
- Safe modification: Consolidate into state management pattern
- Test coverage: None

## Scaling Limits

**PostgreSQL Caching:**
- Current capacity: Handles typical single-user workload
- Limit: No connection pooling configuration visible
- Symptoms at limit: Database connection exhaustion
- Scaling path: Configure pool size, add read replicas

**API Rate Limits:**
- Current capacity: Anthropic tier-dependent
- Limit: Unknown without account verification
- Symptoms at limit: 429 errors from Claude API
- Scaling path: Implement rate limiting, caching helps reduce calls

## Dependencies at Risk

**@xenova/transformers:**
- Risk: Relatively new library, breaking changes possible
- Impact: Embedding generation would fail
- Migration plan: Monitor updates, consider alternative libraries

## Missing Critical Features

**No Rate Limiting:**
- Problem: API endpoints unprotected from abuse
- Current workaround: None
- Blocks: Safe public deployment
- Implementation complexity: Low (add express-rate-limit)

**No API Key Validation:**
- Problem: Invalid Claude API key only discovered on first call
- Current workaround: Health check shows `apiKeyConfigured` but not validated
- Blocks: Clear error messaging for users
- Implementation complexity: Low (add startup validation)

**No Test Suite:**
- Problem: Zero test coverage
- Current workaround: Manual testing
- Blocks: Safe refactoring of large files
- Implementation complexity: Medium (need to establish patterns)

## Test Coverage Gaps

**Critical Paths Untested:**
- What's not tested: CEFR analysis flow, deck operations, question generation
- Risk: Regressions undetected
- Priority: High
- Difficulty to test: Medium (API mocking required)

**Utility Functions Untested:**
- What's not tested: `calculateHash()`, `smartSample()`, `lookupDictionary()`
- Risk: Edge cases not covered
- Priority: Medium
- Difficulty to test: Low (pure functions)

---

*Concerns audit: 2026-01-14*
*Update as issues are fixed or new ones discovered*
