# Testing Patterns

**Analysis Date:** 2026-01-15

## Test Framework

**Runner:**
- Vitest 4.0.17
- Config: `translation-backend/vitest.config.js`

**Assertion Library:**
- Vitest built-in expect
- Matchers: `toBe`, `toEqual`, `toBeTruthy`, `toBeFalsy`

**Run Commands:**
```bash
npm test                              # Run all tests (vitest run)
npm run test:watch                    # Watch mode (vitest)
npm test -- path/to/file.test.js     # Single file
```

## Test File Organization

**Location:**
- `*.test.js` co-located alongside source files
- No separate `tests/` directory

**Naming:**
- `{module-name}.test.js` for all tests
- No distinction between unit/integration in filename

**Structure:**
```
translation-backend/
  utils/
    validation.js
    validation.test.js       # Co-located test file
```

## Test Structure

**Suite Organization:**
```javascript
import { describe, it, expect } from 'vitest';
import { functionUnderTest } from './module';

describe('functionUnderTest', () => {
  it('should handle valid input', () => {
    // arrange
    const input = 'test';

    // act
    const result = functionUnderTest(input);

    // assert
    expect(result).toBe('expected');
  });

  it('should handle edge case', () => {
    expect(functionUnderTest(null)).toBe(null);
  });
});
```

**Patterns:**
- Use `describe()` for grouping by function name
- Use `it()` with "should..." descriptions
- No `beforeEach`/`afterEach` currently used
- Globals enabled (no need to import `describe`, `it`, `expect`)

## Mocking

**Framework:**
- Vitest built-in mocking (vi)
- Not extensively used in current codebase

**Patterns:**
```javascript
import { vi } from 'vitest';

// Module mocking (if needed)
vi.mock('./external-module', () => ({
  externalFunction: vi.fn()
}));
```

**What to Mock:**
- External API calls (not currently mocked)
- Database operations (not currently mocked)
- File system operations (not currently mocked)

**What NOT to Mock:**
- Pure utility functions (test directly)
- Simple transformations

## Fixtures and Factories

**Test Data:**
- Inline test data in test files
- No shared fixtures directory
- No factory functions currently defined

**Example Pattern:**
```javascript
it('should sanitize string with null bytes', () => {
  const input = 'hello\x00world';
  expect(sanitizeString(input)).toBe('helloworld');
});
```

**Location:**
- All test data inline in test files
- No `tests/fixtures/` directory

## Coverage

**Requirements:**
- No enforced coverage target
- Coverage tracking available but not configured

**Configuration:**
- Vitest coverage via c8 (built-in)
- Not currently configured in `vitest.config.js`

**View Coverage:**
```bash
npm test -- --coverage              # If configured
```

## Test Types

**Unit Tests:**
- Test single functions in isolation
- Focus on utility functions (`translation-backend/utils/validation.test.js`)
- Edge case coverage (null, undefined, empty strings)
- Type checking (non-string inputs)

**Integration Tests:**
- Not currently implemented
- Route handlers not tested end-to-end
- Database operations not tested

**E2E Tests:**
- Not currently implemented
- Extension testing done manually

## Common Patterns

**Testing Edge Cases:**
```javascript
describe('sanitizeString', () => {
  it('should return non-string values unchanged', () => {
    expect(sanitizeString(null)).toBe(null);
    expect(sanitizeString(undefined)).toBe(undefined);
    expect(sanitizeString(123)).toBe(123);
  });

  it('should trim whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('should remove null bytes', () => {
    expect(sanitizeString('hello\x00world')).toBe('helloworld');
  });
});
```

**Testing Validation Functions:**
```javascript
describe('isValidLanguage', () => {
  it('should return true for supported languages', () => {
    expect(isValidLanguage('fr')).toBe(true);
    expect(isValidLanguage('es')).toBe(true);
  });

  it('should return false for unsupported languages', () => {
    expect(isValidLanguage('xx')).toBe(false);
    expect(isValidLanguage('')).toBe(false);
  });
});
```

**Testing Security Functions:**
```javascript
describe('containsHtmlOrScript', () => {
  it('should detect script tags', () => {
    expect(containsHtmlOrScript('<script>alert(1)</script>')).toBe(true);
  });

  it('should detect event handlers', () => {
    expect(containsHtmlOrScript('onclick=alert(1)')).toBe(true);
  });

  it('should allow safe text', () => {
    expect(containsHtmlOrScript('Hello world')).toBe(false);
  });
});
```

**Snapshot Testing:**
- Not used in this codebase

## Current Test Coverage

**Tested:**
- `translation-backend/utils/validation.js` - Input validation utilities (26+ test cases)

**Not Tested:**
- Routes (`translation-backend/routes/*.js`)
- Services (`translation-backend/services/*.js`)
- Middleware (`translation-backend/middleware/*.js`)
- Extension modules (`extension/modules/*.js`)

## Test Gaps (Action Items)

**High Priority:**
- Route handler tests (analyze, define, deck)
- API key validation middleware tests
- Claude API error handling tests

**Medium Priority:**
- Database service tests (with mocked pool)
- Embeddings service tests
- Dictionary lookup tests

**Lower Priority:**
- Extension module tests
- End-to-end integration tests

---

*Testing analysis: 2026-01-15*
*Update when test patterns change*
