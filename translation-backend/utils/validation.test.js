import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_LANGUAGES,
  sanitizeString,
  containsHtmlOrScript,
  isValidLanguage,
  getLanguageName
} from './validation.js';

describe('SUPPORTED_LANGUAGES', () => {
  it('should contain 24 EU languages', () => {
    expect(Object.keys(SUPPORTED_LANGUAGES)).toHaveLength(24);
  });

  it('should include French', () => {
    expect(SUPPORTED_LANGUAGES.fr).toBe('French');
  });

  it('should include English', () => {
    expect(SUPPORTED_LANGUAGES.en).toBe('English');
  });
});

describe('sanitizeString', () => {
  it('should return non-string values unchanged', () => {
    expect(sanitizeString(null)).toBe(null);
    expect(sanitizeString(undefined)).toBe(undefined);
    expect(sanitizeString(123)).toBe(123);
  });

  it('should trim whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
    expect(sanitizeString('\thello\n')).toBe('hello');
  });

  it('should remove null bytes', () => {
    expect(sanitizeString('hello\0world')).toBe('helloworld');
    expect(sanitizeString('\0test\0')).toBe('test');
  });

  it('should handle empty strings', () => {
    expect(sanitizeString('')).toBe('');
    expect(sanitizeString('   ')).toBe('');
  });
});

describe('containsHtmlOrScript', () => {
  it('should return false for non-strings', () => {
    expect(containsHtmlOrScript(null)).toBe(false);
    expect(containsHtmlOrScript(undefined)).toBe(false);
    expect(containsHtmlOrScript(123)).toBe(false);
  });

  it('should detect HTML tags', () => {
    expect(containsHtmlOrScript('<script>alert(1)</script>')).toBe(true);
    expect(containsHtmlOrScript('<div>content</div>')).toBe(true);
    expect(containsHtmlOrScript('<img src="x">')).toBe(true);
  });

  it('should detect onclick handlers', () => {
    expect(containsHtmlOrScript('onclick=alert(1)')).toBe(true);
    expect(containsHtmlOrScript('onload=malicious()')).toBe(true);
    expect(containsHtmlOrScript('onerror=hack()')).toBe(true);
  });

  it('should detect javascript: protocol', () => {
    expect(containsHtmlOrScript('javascript:alert(1)')).toBe(true);
    expect(containsHtmlOrScript('JAVASCRIPT:void(0)')).toBe(true);
  });

  it('should return false for safe strings', () => {
    expect(containsHtmlOrScript('Hello world')).toBe(false);
    expect(containsHtmlOrScript('This is a normal sentence.')).toBe(false);
    expect(containsHtmlOrScript('2 < 3 > 1')).toBe(false);
  });
});

describe('isValidLanguage', () => {
  it('should accept valid language codes', () => {
    expect(isValidLanguage('fr')).toBe(true);
    expect(isValidLanguage('en')).toBe(true);
    expect(isValidLanguage('de')).toBe(true);
    expect(isValidLanguage('es')).toBe(true);
  });

  it('should accept uppercase language codes', () => {
    expect(isValidLanguage('FR')).toBe(true);
    expect(isValidLanguage('EN')).toBe(true);
  });

  it('should reject invalid language codes', () => {
    expect(isValidLanguage('xx')).toBe(false);
    expect(isValidLanguage('invalid')).toBe(false);
    expect(isValidLanguage('123')).toBe(false);
  });

  it('should reject empty or null values', () => {
    expect(isValidLanguage('')).toBe(false);
    expect(isValidLanguage(null)).toBe(false);
    expect(isValidLanguage(undefined)).toBe(false);
  });
});

describe('getLanguageName', () => {
  it('should return correct language names', () => {
    expect(getLanguageName('fr')).toBe('French');
    expect(getLanguageName('en')).toBe('English');
    expect(getLanguageName('de')).toBe('German');
  });

  it('should handle uppercase codes', () => {
    expect(getLanguageName('FR')).toBe('French');
    expect(getLanguageName('EN')).toBe('English');
  });

  it('should return Unknown for invalid codes', () => {
    expect(getLanguageName('xx')).toBe('Unknown');
    expect(getLanguageName('invalid')).toBe('Unknown');
  });

  it('should return Unknown for empty or null values', () => {
    expect(getLanguageName('')).toBe('Unknown');
    expect(getLanguageName(null)).toBe('Unknown');
    expect(getLanguageName(undefined)).toBe('Unknown');
  });
});
