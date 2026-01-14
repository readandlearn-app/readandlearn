// CEFR Analysis routes
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
// ENDPOINT: CEFR Analysis (Optimized)
// ========================================
router.post('/analyze',
  (req, res, next) => middleware.validateAnalyzeRequest(req, res, next),
  (req, res, next) => middleware.requireValidApiKey(req, res, next),
  async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('📥 POST /analyze');
    console.log('Time:', new Date().toISOString());

    const { text, url = null, useCache = true, language = 'fr' } = req.body;
    const normalizedLanguage = language.toLowerCase();
    const languageName = services.getLanguageName(normalizedLanguage);

    // Smart sampling
    const sampled = services.smartSample(text, parseInt(process.env.MAX_TEXT_WORDS) || 800);
    console.log(`📄 Text: ${sampled.originalLength} words → ${sampled.sampledLength || sampled.originalLength} words (sampled: ${sampled.sampled})`);

    // Calculate hash
    const textHash = services.calculateHash(sampled.text);
    console.log(`🔑 Hash: ${textHash}`);

    // Check cache
    if (useCache && process.env.ENABLE_CACHING === 'true') {
      const cacheResult = await pool.query(
        'SELECT * FROM analyses WHERE text_hash = $1',
        [textHash]
      );

      if (cacheResult.rows.length > 0) {
        console.log('💾 Cache HIT!');
        const cached = cacheResult.rows[0];

        // Update hit count and last accessed
        await pool.query(
          'UPDATE analyses SET hit_count = hit_count + 1, last_accessed = NOW() WHERE text_hash = $1',
          [textHash]
        );

        await services.logUsage('analyze', cached.language, true, 0, 0);

        return res.json({
          cefr_level: cached.cefr_level,
          confidence: cached.confidence,
          vocabulary_examples: cached.vocabulary_examples,
          grammar_features: cached.grammar_features,
          reasoning: cached.reasoning,
          cached: true,
          hit_count: cached.hit_count + 1
        });
      }
      console.log('💾 Hash cache MISS');

      // Tier 2: Check semantic similarity with local embeddings
      console.log('🔍 Generating local embedding for similarity search...');
      const embedding = await services.generateEmbedding(sampled.text);

      if (embedding) {
        const similarArticles = await services.findSimilarArticles(embedding, 0.90, 1);  // 90% similarity threshold

        if (similarArticles.length > 0) {
          const similar = similarArticles[0];
          console.log(`✅ VECTOR SIMILARITY HIT! (${(similar.similarity * 100).toFixed(1)}% similar to "${similar.url}")`);
          console.log(`   Returning cached CEFR: ${similar.cefr_level}`);

          // Update access count
          await pool.query(
            'UPDATE article_embeddings SET access_count = access_count + 1, last_accessed = NOW() WHERE url = $1',
            [similar.url]
          );

          await services.logUsage('analyze', normalizedLanguage, true, 0, 0);

          return res.json({
            cefr_level: similar.cefr_level,
            confidence: 'high',
            vocabulary_examples: [],
            grammar_features: [],
            reasoning: `Similar to previously analyzed article (${(similar.similarity * 100).toFixed(1)}% match)`,
            language: normalizedLanguage,
            cached: true,
            cache_type: 'vector_similarity',
            similar_url: similar.url,
            similarity_score: similar.similarity
          });
        }
        console.log('❌ No similar articles found (< 90% similarity)');
      }
    }

    // Tier 3: Call AI API (full analysis)
    console.log('🤖 Calling AI API for full analysis...');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: `Assess CEFR level (A1-C2) of ${languageName} text. Consider vocabulary complexity, grammar structures, sentence complexity.

${languageName} text:
"${sampled.text}"

Return ONLY valid JSON:
{"cefr_level":"B2","confidence":"high","vocabulary_examples":["word1","word2","word3"],"grammar_features":["feature1","feature2"],"reasoning":"Brief explanation"}`
        }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ AI API error:', error);
      await services.logUsage('analyze', normalizedLanguage, false, 0, 0);
      return res.status(500).json({ error: 'Analysis service error' });
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Calculate cost
    const inputTokens = data.usage.input_tokens;
    const outputTokens = data.usage.output_tokens;
    const cost = (inputTokens * 0.80 + outputTokens * 4.00) / 1000000;

    console.log(`💰 Tokens: ${inputTokens} in + ${outputTokens} out = $${cost.toFixed(6)}`);

    // Parse JSON
    let result;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      result = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('❌ Failed to parse:', content);
      return res.status(500).json({ error: 'Failed to parse analysis' });
    }

    // Store in hash cache
    if (process.env.ENABLE_CACHING === 'true') {
      try {
        await pool.query(
          `INSERT INTO analyses (text_hash, url, language, cefr_level, confidence, vocabulary_examples, grammar_features, reasoning, word_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (text_hash) DO UPDATE SET
           hit_count = analyses.hit_count + 1,
           last_accessed = NOW()`,
          [textHash, url, normalizedLanguage, result.cefr_level, result.confidence,
           JSON.stringify(result.vocabulary_examples), JSON.stringify(result.grammar_features),
           result.reasoning, sampled.originalLength]
        );
        console.log('💾 Cached in hash table');
      } catch (err) {
        console.error('Cache storage failed:', err.message);
      }

      // Store local embedding for semantic similarity
      if (url) {
        try {
          console.log('🔮 Generating and storing local embedding...');
          const embedding = await services.generateEmbedding(sampled.text);

          if (embedding) {
            const urlHash = services.calculateHash(url);
            const textPreview = text.substring(0, 500);

            await pool.query(
              `INSERT INTO article_embeddings (url, url_hash, text_preview, embedding, cefr_level, word_count)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (url) DO UPDATE SET
                 embedding = EXCLUDED.embedding,
                 cefr_level = EXCLUDED.cefr_level,
                 word_count = EXCLUDED.word_count,
                 last_accessed = NOW()`,
              [url, urlHash, textPreview, JSON.stringify(embedding), result.cefr_level, sampled.originalLength]
            );
            console.log('🔮 Local embedding stored for future similarity matching');
          }
        } catch (err) {
          console.error('Embedding storage failed:', err.message);
        }
      }
    }

    await services.logUsage('analyze', normalizedLanguage, false, inputTokens + outputTokens, cost);

    console.log('✅ Analysis complete');
    console.log('========================================\n');

    res.json({ ...result, language: normalizedLanguage, cached: false });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('========================================\n');
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

module.exports = { router, init };
