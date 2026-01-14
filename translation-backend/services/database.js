// Database service - PostgreSQL operations
const { Pool } = require('pg');

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

/**
 * Test database connection on startup
 */
function testConnection() {
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('❌ Database connection failed:', err);
    } else {
      console.log('✅ Database connected at:', res.rows[0].now);
    }
  });
}

/**
 * Find similar articles using vector similarity
 * @param {number[]} embedding - The embedding vector to compare against
 * @param {number} similarityThreshold - Minimum similarity score (0-1)
 * @param {number} limit - Maximum results to return
 * @returns {Promise<Object[]>} Similar articles with similarity scores
 */
async function findSimilarArticles(embedding, similarityThreshold = 0.85, limit = 5) {
  try {
    const embeddingString = JSON.stringify(embedding);

    const result = await pool.query(
      `SELECT
         url,
         title,
         cefr_level,
         word_count,
         text_preview,
         1 - (embedding <=> $1::vector) as similarity,
         analyzed_at
       FROM article_embeddings
       WHERE 1 - (embedding <=> $1::vector) > $2
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      [embeddingString, similarityThreshold, limit]
    );

    return result.rows;
  } catch (error) {
    console.error('❌ Similarity search failed:', error.message);
    return [];
  }
}

/**
 * Log usage analytics
 * @param {string} action - The action performed
 * @param {string} language - The language code
 * @param {boolean} cacheHit - Whether this was a cache hit
 * @param {number} tokensUsed - Number of tokens used
 * @param {number} costUsd - Cost in USD
 */
async function logUsage(action, language, cacheHit, tokensUsed = 0, costUsd = 0) {
  if (!process.env.ENABLE_ANALYTICS) return;

  try {
    await pool.query(
      'INSERT INTO usage_log (action, language, cache_hit, tokens_used, cost_usd) VALUES ($1, $2, $3, $4, $5)',
      [action, language, cacheHit, tokensUsed, costUsd]
    );
  } catch (err) {
    console.error('Failed to log usage:', err.message);
  }
}

module.exports = {
  pool,
  testConnection,
  findSimilarArticles,
  logUsage
};
