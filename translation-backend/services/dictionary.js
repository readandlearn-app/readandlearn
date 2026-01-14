// Dictionary service - Local dictionary lookup
// Optimized for French with frequency and learned dictionaries

const { getLanguageName } = require('../utils/validation');

// Pool will be injected via init()
let pool = null;

/**
 * Initialize service with database pool
 */
function init(databasePool) {
  pool = databasePool;
}

/**
 * Look up word in local dictionaries (FREE & INSTANT!)
 * Only available for French currently - other languages go to Claude AI
 * @param {string} word - Word to look up
 * @param {string} language - ISO 639-1 language code
 * @returns {Promise<Object|null>} Dictionary entry or null if not found
 */
async function lookupDictionary(word, language = 'fr') {
  try {
    // Dictionary lookup only available for French currently
    // Other languages go directly to Claude AI
    if (language !== 'fr') {
      console.log(`📚 Dictionary lookup skipped for ${getLanguageName(language)} (using AI)`);
      return null;
    }

    console.log(`📚 Checking French dictionaries for: "${word}"`);

    // Check frequency list dictionary first (5k words)
    const freqResult = await pool.query(
      'SELECT * FROM french_dictionary WHERE LOWER(word) = LOWER($1) LIMIT 1',
      [word.trim()]
    );

    if (freqResult.rows.length > 0) {
      const entry = freqResult.rows[0];
      console.log(`✅ Frequency dictionary HIT: "${word}" (${entry.part_of_speech})`);

      return {
        definition: entry.definition_en || entry.definition_fr || entry.translation,
        translation: entry.translation,
        type: entry.part_of_speech || 'unknown',
        example: null,
        source: 'frequency_dictionary',
        cefr: null
      };
    }

    // Check learned dictionary second (AI-learned words)
    const learnedResult = await pool.query(
      'SELECT * FROM learned_dictionary WHERE LOWER(word) = LOWER($1) LIMIT 1',
      [word.trim()]
    );

    if (learnedResult.rows.length > 0) {
      const entry = learnedResult.rows[0];
      console.log(`✅ Learned dictionary HIT: "${word}" (learned ${entry.learn_count}x)`);

      return {
        definition: entry.definition_en || entry.translation,
        translation: entry.translation,
        type: entry.part_of_speech || 'unknown',
        example: null,
        source: 'learned_dictionary',
        cefr: null
      };
    }

    console.log(`❌ Dictionary MISS: "${word}" (will call AI)`);
    return null;
  } catch (error) {
    console.error('❌ Dictionary error:', error.message);
    return null;
  }
}

module.exports = {
  init,
  lookupDictionary
};
