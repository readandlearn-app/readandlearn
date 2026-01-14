// Word definition routes
const express = require('express');
const router = express.Router();

// Dependencies injected via init()
let pool = null;
let services = null;
let middleware = null;

/**
 * Initialize route dependencies
 */
function init(deps) {
  pool = deps.pool;
  services = deps.services;
  middleware = deps.middleware;
}

// ========================================
// ENDPOINT: Define Word (Dictionary-First Routing)
// ========================================
router.post('/define',
  (req, res, next) => middleware.validateDefineRequest(req, res, next),
  (req, res, next) => middleware.requireValidApiKey(req, res, next),
  async (req, res) => {
  try {
    const { word, context = '', language = 'fr', targetLanguage = 'en', forceAI = false } = req.body;

    console.log(`📖 Define: "${word}" (${language})`);

    // Step 1: Check vocabulary cache
    if (process.env.ENABLE_CACHING === 'true') {
      const cacheResult = await pool.query(
        'SELECT * FROM vocabulary_cache WHERE word = $1 AND language = $2',
        [word.toLowerCase(), language]
      );

      if (cacheResult.rows.length > 0) {
        console.log('💾 Vocabulary cache HIT');
        const cached = cacheResult.rows[0];
        await services.logUsage('define', language, true, 0, 0);
        return res.json({
          definition: cached.definition,
          translation: cached.translation,
          cefr: cached.cefr_level,
          type: cached.word_type,
          examples: cached.examples,
          source: 'cache',
          cached: true
        });
      }
    }

    let result;
    let tokens = 0;
    let cost = 0;

    // Step 2: Try dictionary first (FREE!) unless context requires AI or forceAI is true
    if (!context && !forceAI) {
      const dictResult = await services.lookupDictionary(word, language);
      if (dictResult) {
        result = dictResult;
        console.log('✅ Using dictionary definition (FREE!)');
      }
    }

    // Step 3: Fall back to AI if:
    // - Dictionary failed
    // - Context provided (needs contextual understanding)
    // - forceAI flag set
    if (!result) {
      const claudeResult = await services.getClaudeDefinition(word, context, language);
      result = claudeResult;
      tokens = claudeResult.tokens;
      cost = claudeResult.cost;

      // Auto-populate learned_dictionary with AI's definition (French only)
      if (language === 'fr' && result.definition && result.translation) {
        try {
          await pool.query(
            `INSERT INTO learned_dictionary (word, translation, part_of_speech, definition_en)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (word) DO UPDATE SET
               learn_count = learned_dictionary.learn_count + 1`,
            [word.toLowerCase(), result.translation, result.type || 'unknown', result.definition]
          );
          console.log(`🌱 Added "${word}" to learned dictionary (from AI)`);
        } catch (err) {
          console.error('Learned dictionary auto-add failed:', err.message);
        }
      }
    }

    // Store in vocabulary cache
    if (process.env.ENABLE_CACHING === 'true') {
      try {
        await pool.query(
          `INSERT INTO vocabulary_cache (word, language, definition, translation, cefr_level, word_type)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (word, language) DO NOTHING`,
          [word.toLowerCase(), language, result.definition, result.translation, result.cefr, result.type]
        );
      } catch (err) {
        console.error('Vocabulary cache storage failed:', err.message);
      }
    }

    await services.logUsage('define', language, false, tokens, cost);

    res.json({
      definition: result.definition,
      translation: result.translation,
      cefr: result.cefr,
      type: result.type,
      example: result.example,
      source: result.source,
      cached: false
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// ========================================
// ENDPOINT: Batch Define (Optimized)
// ========================================
router.post('/define-batch',
  (req, res, next) => middleware.requireValidApiKey(req, res, next),
  async (req, res) => {
  try {
    const { words, language = 'fr' } = req.body;

    if (!words || !Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ error: 'Words array is required' });
    }

    const normalizedLanguage = language.toLowerCase();
    const languageName = services.getLanguageName(normalizedLanguage);
    console.log(`📚 Batch define: ${words.length} ${languageName} words`);

    const results = [];
    const uncachedWords = [];

    // Check cache for each word
    for (const wordObj of words) {
      const word = typeof wordObj === 'string' ? wordObj : wordObj.word;
      const cacheResult = await pool.query(
        'SELECT * FROM vocabulary_cache WHERE word = $1 AND language = $2',
        [word.toLowerCase(), normalizedLanguage]
      );

      if (cacheResult.rows.length > 0) {
        const cached = cacheResult.rows[0];
        results.push({
          word,
          definition: cached.definition,
          translation: cached.translation,
          cefr: cached.cefr_level,
          type: cached.word_type,
          cached: true
        });
      } else {
        uncachedWords.push(wordObj);
      }
    }

    console.log(`💾 Cache: ${results.length} hits, ${uncachedWords.length} misses`);

    // Batch API call for uncached words
    if (uncachedWords.length > 0) {
      const wordsList = uncachedWords.map(w => typeof w === 'string' ? w : w.word).join(', ');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 800,
          messages: [{
            role: 'user',
            content: `Define these ${languageName} words: ${wordsList}. Provide definitions and translations in English. Return JSON array:
[{"word":"word1","definition":"... (in English)","translation":"... (in English)","cefr":"B2","type":"noun"},...]`
          }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.content[0].text;

        const inputTokens = data.usage.input_tokens;
        const outputTokens = data.usage.output_tokens;
        const cost = (inputTokens * 0.80 + outputTokens * 4.00) / 1000000;

        console.log(`💰 Batch call: ${inputTokens + outputTokens} tokens = $${cost.toFixed(6)}`);

        try {
          const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\[[\s\S]*\]/);
          const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
          const batchResults = JSON.parse(jsonText);

          // Store in cache and learned dictionary, then add to results
          for (const item of batchResults) {
            // Store in vocabulary cache
            await pool.query(
              `INSERT INTO vocabulary_cache (word, language, definition, translation, cefr_level, word_type)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (word, language) DO NOTHING`,
              [item.word.toLowerCase(), normalizedLanguage, item.definition, item.translation, item.cefr, item.type]
            );

            // Store in learned dictionary (French only - dictionary optimization)
            if (normalizedLanguage === 'fr' && item.definition && item.translation) {
              await pool.query(
                `INSERT INTO learned_dictionary (word, translation, part_of_speech, definition_en)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (word) DO UPDATE SET
                   learn_count = learned_dictionary.learn_count + 1`,
                [item.word.toLowerCase(), item.translation, item.type || 'unknown', item.definition]
              );
            }

            results.push({ ...item, cached: false });
          }

          await services.logUsage('define-batch', normalizedLanguage, false, inputTokens + outputTokens, cost);
        } catch (parseError) {
          console.error('❌ Failed to parse batch:', content);
        }
      }
    }

    res.json({ results, total: results.length });

  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

module.exports = { router, init };
