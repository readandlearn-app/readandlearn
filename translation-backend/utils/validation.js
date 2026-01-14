// Validation utilities for Read & Learn backend
// Extracted from server.js for testing and reusability

const SUPPORTED_LANGUAGES = {
  bg: 'Bulgarian', hr: 'Croatian', cs: 'Czech', da: 'Danish',
  nl: 'Dutch', en: 'English', et: 'Estonian', fi: 'Finnish',
  fr: 'French', de: 'German', el: 'Greek', hu: 'Hungarian',
  ga: 'Irish', it: 'Italian', lv: 'Latvian', lt: 'Lithuanian',
  mt: 'Maltese', pl: 'Polish', pt: 'Portuguese', ro: 'Romanian',
  sk: 'Slovak', sl: 'Slovenian', es: 'Spanish', sv: 'Swedish'
};

/**
 * Sanitize a string by removing null bytes and trimming whitespace
 * @param {string} str - Input string
 * @returns {string} Sanitized string
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/\0/g, '');
}

/**
 * Check if a string contains HTML tags or script injection patterns
 * @param {string} str - Input string to check
 * @returns {boolean} True if HTML or script patterns detected
 */
function containsHtmlOrScript(str) {
  if (typeof str !== 'string') return false;
  // Check for HTML tags (require at least one letter after <)
  const htmlPattern = /<[a-zA-Z][^>]*>/;
  // Check for common script injection patterns
  const scriptPattern = /(javascript:|on\w+=|<script)/i;
  return htmlPattern.test(str) || scriptPattern.test(str);
}

/**
 * Validate that a language code is supported
 * @param {string} code - ISO 639-1 language code
 * @returns {boolean} True if language is supported
 */
function isValidLanguage(code) {
  if (!code || typeof code !== 'string') return false;
  return !!SUPPORTED_LANGUAGES[code.toLowerCase()];
}

/**
 * Get the display name for a language code
 * @param {string} code - ISO 639-1 language code
 * @returns {string} Language display name or 'Unknown' if not found
 */
function getLanguageName(code) {
  if (!code) return 'Unknown';
  return SUPPORTED_LANGUAGES[code.toLowerCase()] || 'Unknown';
}

module.exports = {
  SUPPORTED_LANGUAGES,
  sanitizeString,
  containsHtmlOrScript,
  isValidLanguage,
  getLanguageName
};
