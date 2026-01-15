# Codebase Concerns

**Analysis Date:** 2026-01-15

## Tech Debt

**N+1 Query Pattern in Batch Define:**
- Issue: Individual database queries per word in batch operations
- Files: `translation-backend/routes/define.js` (lines 147-152)
- Why: Implemented for simplicity during initial development
- Impact: Performance degrades with large word batches (100 words = 100+ queries)
- Fix approach: Use `WHERE word IN (...)` single query pattern

**Inconsistent Error Response Format:**
- Issue: Error responses vary in structure across routes
- Files: All route files in `translation-backend/routes/`
- Why: Each route developed independently
- Impact: Frontend must handle multiple error formats
- Fix approach: Create centralized error handler middleware

**Magic Numbers Throughout:**
- Issue: Hardcoded values scattered in code
- Files:
  - `translation-backend/services/claude.js` (line 85) - pricing
  - `translation-backend/routes/analyze.js` (line 79) - similarity threshold 0.90
- Why: Quick implementation, values not expected to change
- Impact: Hard to update pricing, thresholds without code review
- Fix approach: Centralize constants in config module

## Known Bugs

**No critical bugs detected**

The codebase appears stable. Minor issues noted below in fragile areas.

## Security Considerations

**Weak User ID Generation:**
- Risk: User IDs use `Math.random()` which is not cryptographically secure
- File: `extension/modules/utils.js` (getUserId function)
- Current mitigation: User IDs only used for vocabulary deck isolation, not auth
- Recommendations: Use `crypto.randomUUID()` for production

**Environment Variables in Git History:**
- Risk: `.env` file may have been committed historically with real keys
- File: `translation-backend/.env` (should be gitignored)
- Current mitigation: `.env.example` exists as template
- Recommendations: Audit git history, rotate any exposed keys

**Generic Error Messages Leak Details:**
- Risk: Some error responses include `error.message` which may expose internals
- Files: All route error handlers
- Current mitigation: None
- Recommendations: Sanitize error messages before returning to client

## Performance Bottlenecks

**Embedding Generation Time:**
- Problem: Local embedding generation takes ~300ms per request
- File: `translation-backend/services/embeddings.js` (line 37)
- Measurement: ~300ms per embedding operation
- Cause: Xenova Transformers model inference on CPU
- Improvement path: Pre-compute embeddings, use batch processing, or GPU acceleration

**Text Truncation for Embeddings:**
- Problem: Only first 512 characters used for embeddings
- File: `translation-backend/services/embeddings.js` (line 37)
- Measurement: Long articles lose context
- Cause: Model input limit
- Improvement path: Chunking strategy or different embedding model

## Fragile Areas

**Three-Tier Caching Logic:**
- File: `translation-backend/routes/analyze.js` (lines 44-108)
- Why fragile: Complex state management (hash → similarity → AI) with multiple fallback paths
- Common failures: Cache miss detection, similarity threshold tuning
- Safe modification: Add comprehensive logging before changes, write tests
- Test coverage: No tests - high risk area

**Embeddings Service Disabled Flag:**
- File: `translation-backend/services/embeddings.js` (line 26)
- Why fragile: Uses string 'disabled' as flag instead of boolean
- Common failures: Type confusion, silent failures
- Safe modification: Refactor to proper state machine or boolean
- Test coverage: No tests

**Extension Module Import Chain:**
- File: `extension/content.js` (lines 52-68)
- Why fragile: If any module import fails, entire extension fails silently
- Common failures: Module not found, syntax errors in modules
- Safe modification: Add error boundary with user notification
- Test coverage: No tests

## Scaling Limits

**PostgreSQL Connection Pool:**
- Current capacity: Default pool size (10 connections)
- Limit: ~50-100 concurrent users before connection exhaustion
- Symptoms at limit: Connection timeout errors
- Scaling path: Increase pool size, add connection pooling (PgBouncer)

**Rate Limiting:**
- Current capacity: 30 requests per 60 seconds per IP
- Limit: May be too permissive for expensive AI operations
- Symptoms at limit: High API costs
- Scaling path: Per-user rate limiting, tiered limits based on operation cost

## Dependencies at Risk

**@xenova/transformers:**
- Risk: Relatively new library, compatibility with future Node.js versions uncertain
- Impact: Embedding generation would break
- Migration plan: Could switch to OpenAI/Voyage embeddings API (paid)

**pg (node-postgres):**
- Risk: None - stable, well-maintained
- Note: Current version 8.11.3, latest is ~8.12+

## Missing Critical Features

**No User Authentication:**
- Problem: Anyone can access vocabulary decks with known user ID
- Current workaround: Random user IDs provide obscurity
- Blocks: Multi-device sync, sharing, premium features
- Implementation complexity: Medium (add OAuth or email auth)

**No Graceful Shutdown:**
- Problem: No signal handlers for SIGTERM/SIGINT
- File: `translation-backend/server.js`
- Current workaround: Relies on Docker/platform restart
- Blocks: Clean deployments, database connection cleanup
- Implementation complexity: Low (add process signal handlers)

**No Request Timeout:**
- Problem: Claude API calls have no timeout
- Files: `translation-backend/routes/analyze.js`, `translation-backend/routes/define.js`
- Current workaround: Relies on API-side timeouts
- Blocks: Reliable error handling
- Implementation complexity: Low (add AbortController with timeout)

## Test Coverage Gaps

**Routes Not Tested:**
- What's not tested: All route handlers (`/analyze`, `/define`, `/deck`, `/questions`)
- Risk: Breaking changes undetected
- Priority: High
- Difficulty to test: Medium (need to mock database and Claude API)

**Caching Logic Not Tested:**
- What's not tested: Three-tier cache flow (hash → similarity → AI fallback)
- Risk: Cache corruption, missed optimizations
- Priority: High
- Difficulty to test: Medium (need to set up test database with pgvector)

**Extension Modules Not Tested:**
- What's not tested: All extension modules (`api.js`, `ui.js`, `language.js`)
- Risk: UI bugs, API communication failures
- Priority: Medium
- Difficulty to test: High (need Chrome extension testing framework)

**Error Scenarios Not Tested:**
- What's not tested: API rate limits, database failures, network errors
- Risk: Silent failures in production
- Priority: Medium
- Difficulty to test: Medium (mock error responses)

---

*Concerns audit: 2026-01-15*
*Update as issues are fixed or new ones discovered*
