# Testing Patterns

**Analysis Date:** 2026-01-14

## Test Framework

**Runner:**
- Not configured - No test framework currently in use

**Assertion Library:**
- Not applicable

**Run Commands:**
```bash
# No test commands defined in package.json
# Manual testing via API endpoints
curl http://localhost:3000/health
```

## Test File Organization

**Location:**
- No test files present
- No `__tests__/` directories
- No `*.test.js` or `*.spec.js` files

**Naming:**
- Not established

**Structure:**
- Not established

## Test Structure

**Suite Organization:**
- Not implemented

**Patterns:**
- Not established

## Mocking

**Framework:**
- Not configured

**Patterns:**
- Not established

## Fixtures and Factories

**Test Data:**
- Not established

**Location:**
- Not applicable

## Coverage

**Requirements:**
- No coverage requirements defined
- No coverage tooling configured

**Configuration:**
- Not applicable

## Test Types

**Unit Tests:**
- Not implemented
- Recommended for: `calculateHash()`, `smartSample()`, `lookupDictionary()`

**Integration Tests:**
- Not implemented
- Recommended for: API endpoints, database operations

**E2E Tests:**
- Not implemented
- Recommended for: Full user flow (analyze article → add to deck → export)

## Current Testing Approach

**Manual Testing:**
- Health check endpoint: `GET /health`
- API testing via curl or browser DevTools
- Extension testing via Chrome Developer Mode

**Health Check Endpoint:**
```javascript
// translation-backend/server.js line 166
app.get('/health', async (req, res) => {
  // Returns: { status, dbConnected, apiKeyConfigured, timestamp }
});
```

**Console Logging:**
- 126 console.log statements for debugging
- Emoji prefixes for visual identification
- Request/response logging on each endpoint

## Recommended Test Strategy

**Priority 1 - Unit Tests:**
- Hash calculation: `calculateHash(text)` in `server.js`
- Text sampling: `smartSample(text, maxWords)` in `server.js`
- Dictionary lookup: `lookupDictionary(word, language)` in `server.js`
- Color detection: `getDominantColor()` in `content.js`

**Priority 2 - Integration Tests:**
- CEFR analysis endpoint: `POST /analyze`
- Word definition endpoint: `POST /define`
- Deck management: `POST /deck/add`, `GET /deck/:userId`
- Database cache hit/miss scenarios

**Priority 3 - E2E Tests:**
- Full extension flow: page load → analyze → select word → add to deck
- Export functionality: deck → Anki CSV, JSON
- Question generation and quiz completion

## Getting Started with Testing

**Recommended Framework:**
- Vitest or Jest for unit/integration tests
- Playwright for E2E tests

**Basic Setup:**
```bash
# Add to package.json
npm install --save-dev vitest @vitest/coverage-c8

# Add scripts
"scripts": {
  "test": "vitest",
  "test:coverage": "vitest --coverage"
}
```

---

*Testing analysis: 2026-01-14*
*Update when test patterns established*
