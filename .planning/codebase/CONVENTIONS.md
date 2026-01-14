# Coding Conventions

**Analysis Date:** 2026-01-14

## Naming Patterns

**Files:**
- camelCase for JavaScript files: `server.js`, `content.js`, `background.js`
- snake_case for data/utility files: `import_frequency_words.js`, `french_5k.txt`
- UPPERCASE.md for documentation: `README.md`, `LICENSE`

**Functions:**
- camelCase for all functions: `analyzeArticle()`, `calculateHash()`, `getDominantColor()`
- No special prefix for async functions
- Descriptive names: `handleTextSelection()`, `createPersistentTooltip()`

**Variables:**
- camelCase for variables: `currentAnalysis`, `menuExpanded`, `selectionModeActive`
- SCREAMING_SNAKE_CASE for constants: `BACKEND_URL`, `USER_ID`, `PORT`
- No underscore prefix for private members

**Database:**
- snake_case for table names: `deck_cards`, `usage_log`, `vocabulary_cache`
- snake_case for column names: `text_hash`, `cefr_level`, `word_count`

## Code Style

**Formatting:**
- 2-space indentation (consistent throughout)
- No Prettier or formatter configured
- Line length varies (no strict limit)

**Quotes:**
- Single quotes for strings: `'API_REQUEST'`, `'http://localhost:3000'`
- Template literals with backticks for interpolation and SQL
- Double quotes in HTML attributes within strings

**Semicolons:**
- Required and used consistently

**Linting:**
- No ESLint or linting tools configured
- Manual code review for style consistency

## Import Organization

**Order:**
1. Node.js built-ins: `require('crypto')`
2. External packages: `require('express')`, `require('cors')`
3. No internal modules (monolithic structure)

**Grouping:**
- Imports grouped at file top
- No blank lines between import groups

**Path Aliases:**
- Not used (no build step)

## Error Handling

**Patterns:**
- Try-catch blocks at route handler level
- HTTP status codes: 400 (bad request), 404 (not found), 500 (server error)
- JSON error responses with `error` and `message` fields

**Error Types:**
- Throw on invalid input, missing dependencies
- Log with console.error before returning error response
- Graceful fallbacks when optional services unavailable

## Logging

**Framework:**
- console.log, console.error (no logging library)

**Patterns:**
- Emoji prefixes for visual clarity: `✅`, `❌`, `💾`, `🤖`, `📥`
- Descriptive log messages with context
- Request details logged on each endpoint

**Example:**
```javascript
console.log('📥 POST /analyze');
console.log(`Text length: ${text.length} characters`);
console.error('❌ Error generating questions:', error);
```

## Comments

**When to Comment:**
- Section headers with `========` dividers
- Explain business logic and algorithms
- Document non-obvious thresholds and magic numbers

**Section Headers:**
```javascript
// ========================================
// COLOR DETECTION
// ========================================

// ========================================
// ENDPOINT: Health Check
// ========================================
```

**JSDoc/TSDoc:**
- Not used (no TypeScript)
- Inline comments for complex logic

**TODO Comments:**
- Format: `// TODO: description`
- Minimal TODOs in codebase

## Function Design

**Size:**
- Large functions present (content.js has functions > 100 lines)
- Consider extraction for better maintainability

**Parameters:**
- Object destructuring for multiple parameters
- Default values: `options = {}`

**Return Values:**
- Explicit return statements
- JSON responses for API endpoints
- Promise-based async operations

## Module Design

**Exports:**
- No ES6 modules (CommonJS in backend)
- No exports in extension (global scope)

**File Organization:**
- Monolithic files (server.js: 1237 lines, content.js: 1813 lines)
- Functions grouped by feature within files
- Section headers for navigation

---

*Convention analysis: 2026-01-14*
*Update when patterns change*
