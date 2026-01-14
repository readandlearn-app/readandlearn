// Language detection and selection module for Read & Learn extension

import { SUPPORTED_LANGUAGES } from './utils.js';

// State
let currentLanguage = null; // { code: 'fr', name: 'French', confidence: 80, isReliable: true }
let manualLanguageOverride = localStorage.getItem('rl-language-override') || null;

/**
 * Detect the language of text using Chrome's built-in language detection API
 * @param {string} text - Text to analyze
 * @returns {Promise<{code: string, name: string, confidence: number, isReliable: boolean}|null>}
 */
export async function detectLanguage(text) {
  return new Promise((resolve) => {
    chrome.i18n.detectLanguage(text, (result) => {
      if (result && result.languages && result.languages.length > 0) {
        const detected = result.languages[0];
        // Handle region codes like 'pt-BR' -> 'pt'
        const langCode = detected.language.toLowerCase().split('-')[0];
        if (SUPPORTED_LANGUAGES[langCode]) {
          resolve({
            code: langCode,
            name: SUPPORTED_LANGUAGES[langCode],
            confidence: detected.percentage,
            isReliable: result.isReliable
          });
          return;
        }
      }
      resolve(null); // Unsupported or undetected
    });
  });
}

/**
 * Get the effective language code for API calls
 * Respects manual override, falls back to detected, then French as default
 * @returns {string} ISO 639-1 language code
 */
export function getEffectiveLanguage() {
  if (manualLanguageOverride && SUPPORTED_LANGUAGES[manualLanguageOverride]) {
    return manualLanguageOverride;
  }
  return currentLanguage ? currentLanguage.code : 'fr'; // fallback to French
}

/**
 * Get the effective language name for display
 * @returns {string} Full language name
 */
export function getEffectiveLanguageName() {
  const code = getEffectiveLanguage();
  return SUPPORTED_LANGUAGES[code] || 'French';
}

/**
 * Set the current detected language
 * @param {Object|null} lang - Detected language object
 */
export function setCurrentLanguage(lang) {
  currentLanguage = lang;
}

/**
 * Get the current detected language
 * @returns {Object|null} Current language object
 */
export function getCurrentLanguage() {
  return currentLanguage;
}

/**
 * Get the manual language override
 * @returns {string|null} Manual override code or null
 */
export function getManualOverride() {
  return manualLanguageOverride;
}

/**
 * Set manual language override
 * @param {string|null} code - Language code or null to clear
 */
export function setManualOverride(code) {
  if (code === 'auto' || !code) {
    manualLanguageOverride = null;
    localStorage.removeItem('rl-language-override');
    console.log('🌐 Language set to auto-detect');
  } else {
    manualLanguageOverride = code;
    localStorage.setItem('rl-language-override', code);
    console.log(`🌐 Language manually set to: ${SUPPORTED_LANGUAGES[code]} (${code})`);
  }
}

/**
 * Render language selector HTML
 * @returns {string} HTML for language selector dropdown
 */
export function renderLanguageSelector() {
  const current = manualLanguageOverride || 'auto';
  const detectedInfo = currentLanguage ? ` (detected: ${currentLanguage.name})` : '';

  let options = `<option value="auto"${current === 'auto' ? ' selected' : ''}>Auto-detect${detectedInfo}</option>`;
  for (const [code, name] of Object.entries(SUPPORTED_LANGUAGES)) {
    const selected = current === code ? ' selected' : '';
    options += `<option value="${code}"${selected}>${name}</option>`;
  }

  return `
    <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(0,0,0,0.1);">
      <label style="display: block; font-size: 11px; color: #888; margin-bottom: 4px;">Article Language</label>
      <select id="rl-language-select" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ddd; background: white; color: #333; font-size: 13px; cursor: pointer;">
        ${options}
      </select>
    </div>
  `;
}
