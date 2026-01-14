// Utility functions for Read & Learn extension

import { COLORS } from './design.js';

/**
 * Safely escape HTML entities in text to prevent XSS
 * Uses textContent assignment which is inherently safe
 * @param {string} text - Text to escape
 * @returns {string} HTML-escaped text
 */
export function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

/**
 * Sanitize text for safe display in the UI
 * Escapes HTML entities to prevent script injection
 * @param {string} text - The text to sanitize
 * @returns {string} Sanitized text safe for innerHTML
 */
export function sanitizeForDisplay(text) {
  if (text === null || text === undefined) return '';
  return escapeHtml(String(text));
}

/**
 * Safely set text content of an element
 * Preferred over innerHTML when only displaying plain text
 * @param {HTMLElement} element - The element to update
 * @param {string} text - The text to display
 */
export function safeSetText(element, text) {
  if (element) {
    element.textContent = text !== null && text !== undefined ? String(text) : '';
  }
}

/**
 * Escape special regex characters in a string
 * @param {string} string - String to escape
 * @returns {string} Regex-safe string
 */
export function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Download a blob as a file
 * @param {Blob} blob - The blob to download
 * @param {string} filename - Name for the downloaded file
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Get or create a unique user ID
 * @returns {string} User ID stored in localStorage
 */
export function getUserId() {
  let id = localStorage.getItem('readandlearn_user_id');
  if (!id) {
    id = 'user_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('readandlearn_user_id', id);
  }
  return id;
}

/**
 * Supported EU languages (mirrors backend)
 */
export const SUPPORTED_LANGUAGES = {
  bg: 'Bulgarian', hr: 'Croatian', cs: 'Czech', da: 'Danish',
  nl: 'Dutch', en: 'English', et: 'Estonian', fi: 'Finnish',
  fr: 'French', de: 'German', el: 'Greek', hu: 'Hungarian',
  ga: 'Irish', it: 'Italian', lv: 'Latvian', lt: 'Lithuanian',
  mt: 'Maltese', pl: 'Polish', pt: 'Portuguese', ro: 'Romanian',
  sk: 'Slovak', sl: 'Slovenian', es: 'Spanish', sv: 'Swedish'
};

/**
 * Get CEFR level color from centralized design tokens
 * @param {string} level - CEFR level (A1-C2)
 * @returns {string} Color hex code
 */
export function getCefrColor(level) {
  return COLORS.cefr[level] || COLORS.primary.start;
}
