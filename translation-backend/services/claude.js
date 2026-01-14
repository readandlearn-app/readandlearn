// Claude AI service - Consolidated Claude API interactions
const crypto = require('crypto');
const { getLanguageName } = require('../utils/validation');

/**
 * Calculate SHA-256 hash (secure hashing)
 * Note: Upgraded from MD5 to SHA-256 to prevent collision attacks
 * @param {string} text - Text to hash
 * @returns {string} Hexadecimal hash string
 */
function calculateHash(text) {
  return crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
}

/**
 * Smart text sampling for long texts
 * Sample strategy: First 40% + Middle 20% + Last 40%
 * @param {string} text - Text to sample
 * @param {number} maxWords - Maximum words to keep
 * @returns {Object} Sampled text with metadata
 */
function smartSample(text, maxWords = 800) {
  const words = text.split(/\s+/);

  if (words.length <= maxWords) {
    return { text, sampled: false, originalLength: words.length };
  }

  // Sample strategy: First 40% + Middle 20% + Last 40%
  const first = Math.floor(maxWords * 0.4);
  const middle = Math.floor(maxWords * 0.2);
  const last = Math.floor(maxWords * 0.4);

  const startSection = words.slice(0, first).join(' ');
  const midStart = Math.floor((words.length - middle) / 2);
  const midSection = words.slice(midStart, midStart + middle).join(' ');
  const endSection = words.slice(-last).join(' ');

  return {
    text: `${startSection}\n...\n${midSection}\n...\n${endSection}`,
    sampled: true,
    originalLength: words.length,
    sampledLength: maxWords
  };
}

/**
 * Get word definition from Claude AI with contextual understanding
 * @param {string} word - Word to define
 * @param {string} context - Optional context sentence
 * @param {string} language - ISO 639-1 language code
 * @returns {Promise<Object>} Definition result with tokens and cost
 */
async function getClaudeDefinition(word, context = '', language = 'fr') {
  const languageName = getLanguageName(language);
  console.log(`🤖 Calling AI for ${languageName} definition...`);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `Define ${languageName} word "${word}"${context ? ` in context: "${context}"` : ''}. Provide the definition and translation in English. Return JSON:
{"definition":"... (in English)","translation":"... (in English)","cefr":"B2","type":"noun/verb/adj/adv/connector"}`
      }]
    })
  });

  if (!response.ok) {
    throw new Error('AI API error');
  }

  const data = await response.json();
  const content = data.content[0].text;

  const inputTokens = data.usage.input_tokens;
  const outputTokens = data.usage.output_tokens;
  const cost = (inputTokens * 0.80 + outputTokens * 4.00) / 1000000;

  console.log(`💰 AI call: ${inputTokens + outputTokens} tokens = $${cost.toFixed(6)}`);

  const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
  const result = JSON.parse(jsonText);

  return {
    ...result,
    source: 'ai',
    tokens: inputTokens + outputTokens,
    cost
  };
}

module.exports = {
  calculateHash,
  smartSample,
  getClaudeDefinition,
  getLanguageName  // Re-export for convenience
};
