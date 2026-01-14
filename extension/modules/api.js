// API communication module for Read & Learn extension

/**
 * Make API requests via background script (bypasses Private Network Access)
 * @param {string} endpoint - API endpoint (e.g., '/analyze')
 * @param {Object} options - Fetch options (method, headers, body)
 * @returns {Promise<Object>} Response-like object with ok, status, json(), text()
 */
export async function apiFetch(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    // Pass endpoint directly - background.js will prepend the configured backend URL
    chrome.runtime.sendMessage({
      type: 'API_REQUEST',
      url: endpoint,
      options: options,
      expectJson: true
    }, response => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!response) {
        reject(new Error('No response from background script'));
        return;
      }

      // Create a response-like object for consistency with fetch API
      resolve({
        ok: response.ok || false,
        status: response.status || 500,
        json: async () => response.data || { error: response.error || 'Unknown error' },
        text: async () => JSON.stringify(response.data || { error: response.error || 'Unknown error' })
      });
    });
  });
}

/**
 * Analyze article text for CEFR level
 * @param {string} text - Article text content
 * @param {string} language - ISO 639-1 language code
 * @param {string} url - Page URL for caching
 * @returns {Promise<Object>} Analysis result
 */
export async function analyzeText(text, language, url) {
  const response = await apiFetch('/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, url, language })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Analysis failed');
  }

  return response.json();
}

/**
 * Get word definition
 * @param {string} word - Word to define
 * @param {string} context - Context sentence
 * @param {string} language - ISO 639-1 language code
 * @returns {Promise<Object>} Definition result
 */
export async function defineWord(word, context, language) {
  const response = await apiFetch('/define', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, context, language })
  });

  if (!response.ok) {
    throw new Error('Failed to get meaning');
  }

  return response.json();
}

/**
 * Add word to deck
 * @param {Object} cardData - Card data to add
 * @returns {Promise<Object>} Add result
 */
export async function addToDeckApi(cardData) {
  const response = await apiFetch('/deck/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cardData)
  });

  if (!response.ok) {
    throw new Error('Failed to add to deck');
  }

  return response.json();
}

/**
 * Get user's deck
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Deck data
 */
export async function fetchDeck(userId) {
  const response = await apiFetch(`/deck/${userId}`);

  if (!response.ok) {
    throw new Error('Failed to load deck');
  }

  return response.json();
}

/**
 * Delete card from deck
 * @param {string} cardId - Card ID to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteCardApi(cardId) {
  const response = await apiFetch(`/deck/${cardId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error('Failed to delete card');
  }

  return response.json();
}

/**
 * Export deck
 * @param {string} userId - User ID
 * @param {string} format - Export format (json, csv, anki)
 * @returns {Promise<Object|string>} Export data
 */
export async function exportDeckApi(userId, format) {
  const response = await apiFetch(`/deck/${userId}/export?format=${format}`);

  if (!response.ok) {
    throw new Error('Export failed');
  }

  if (format === 'json') {
    return response.json();
  }
  return response.text();
}

/**
 * Generate comprehension questions
 * @param {string} text - Article text
 * @param {string} url - Page URL
 * @param {string} level - CEFR level
 * @param {string} examType - Exam type (DELF/DALF)
 * @returns {Promise<Object>} Questions result
 */
export async function generateQuestionsApi(text, url, level, examType) {
  const response = await apiFetch('/questions/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, url, level, examType })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate questions');
  }

  return response.json();
}

/**
 * Add questions to deck
 * @param {Object} questionData - Question set data
 * @returns {Promise<Object>} Add result
 */
export async function addQuestionsToDeckApi(questionData) {
  const response = await apiFetch('/questions/deck/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(questionData)
  });

  if (!response.ok) {
    throw new Error('Failed to add questions to deck');
  }

  return response.json();
}

/**
 * Export questions deck
 * @param {string} userId - User ID
 * @returns {Promise<string>} CSV export data
 */
export async function exportQuestionsApi(userId) {
  const response = await apiFetch(`/questions/deck/${userId}/export?format=anki`);

  if (!response.ok) {
    throw new Error('Export failed');
  }

  return response.text();
}
