# Coding Conventions

**Analysis Date:** 2026-01-15

## Naming Patterns

**Files:**
- camelCase for all JavaScript files (`apiKey.js`, `rateLimit.js`, `validation.js`)
- *.test.js alongside source files (`validation.test.js` next to `validation.js`)
- lowercase for config files (`vitest.config.js`, `package.json`)

**Functions:**
- camelCase for all functions (`validateAnalyzeRequest`, `sanitizeString`, `calculateHash`)
- No special prefix for async functions
- Descriptive action verbs (`findSimilarArticles`, `lookupDictionary`, `generateEmbedding`)

**Variables:**
- camelCase for variables (`textHash`, `sampled`, `embedding`)
- UPPER_SNAKE_CASE for constants (`SUPPORTED_LANGUAGES`, `MAX_TEXT_LENGTH`, `RATE_LIMIT_WINDOW_MS`)
- No underscore prefix for private members

**Types:**
- No TypeScript - plain JavaScript throughout
- JSDoc comments for type documentation

## Code Style

**Formatting:**
- No Prettier config - manual formatting
- 2 space indentation throughout
- ~100 character line length (soft limit)
- Semicolons required and used consistently
- Single quotes in ES modules (extension), double quotes in CommonJS (backend)

**Linting:**
- No ESLint config - manual code review
- No automated formatting on save

## Import Organization

**Order (Backend - CommonJS):**
1. Node.js built-ins (`const fs = require('fs')`)
2. External packages (`const express = require('express')`)
3. Local modules (`const { calculateHash } = require('./services/claude')`)

**Order (Extension - ES Modules):**
1. Local module imports (`import { SUPPORTED_LANGUAGES } from './utils.js'`)
2. No external package imports (extension bundles dependencies)

**Grouping:**
- No blank lines between import groups
- Alphabetical ordering not enforced

**Path Aliases:**
- None defined - relative paths used throughout

## Error Handling

**Patterns:**
- try-catch at route handler level
- Services throw errors with descriptive messages
- Errors caught, logged to console, return JSON error response
- Graceful degradation for non-critical failures (caching, embeddings)

**Error Types:**
- Throw on invalid input, API failures, database errors
- Return null/empty array for expected "not found" cases
- Console.error with emoji prefix for visibility (`❌ Error:`)

**Error Response Format:**
```javascript
res.status(500).json({ error: 'Description', message: error.message });
```

## Logging

**Framework:**
- Console.log/error (no external logging library)
- Emoji prefixes for visual scanning:
  - `✅` Success
  - `❌` Error
  - `📥` Request received
  - `💾` Cache operation
  - `🔮` Embedding operation

**Patterns:**
- Log at route boundaries (request in, response out)
- Log cache hits/misses
- Log external API calls
- No verbose logging in utility functions

**Where:**
- Route handlers: entry/exit logging
- Services: operation-level logging
- Middleware: error logging only

## Comments

**When to Comment:**
- Explain business logic and caching strategies
- Document function parameters and return types (JSDoc)
- Mark section boundaries with visual dividers

**JSDoc/TSDoc:**
- Required for all exported functions
- Format:
```javascript
/**
 * Brief description
 * @param {string} paramName - Description
 * @returns {Promise<Object>} Description
 */
```

**Section Markers:**
```javascript
// ========================================
// ENDPOINT: Analyze Text
// ========================================
```

**TODO Comments:**
- Format: `// TODO: description`
- No username or issue linking convention

## Function Design

**Size:**
- No enforced limit, but functions generally under 50 lines
- Complex logic extracted to helper functions

**Parameters:**
- Typically 2-4 parameters
- Options object pattern not commonly used
- Destructuring in function body, not parameter list

**Return Values:**
- Explicit return statements
- Return early for validation failures
- Return null for "not found" cases

## Module Design

**Exports (Backend - CommonJS):**
```javascript
module.exports = { functionA, functionB, init };
```

**Exports (Extension - ES Modules):**
```javascript
export function functionA() { }
export async function functionB() { }
```

**Dependency Injection:**
- Routes and services use `init(deps)` pattern
- Dependencies stored in module-level variables
```javascript
let pool = null;
let services = null;

function init(deps) {
  pool = deps.pool;
  services = deps.services;
}
```

**Barrel Files:**
- Not used - direct imports to specific files

---

*Convention analysis: 2026-01-15*
*Update when patterns change*
