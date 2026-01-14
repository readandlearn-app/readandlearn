// Deck management routes
const express = require('express');
const router = express.Router();

// Dependencies injected via init()
let pool = null;
let middleware = null;

/**
 * Initialize route dependencies
 */
function init(deps) {
  pool = deps.pool;
  middleware = deps.middleware;
}

// ========================================
// ENDPOINT: Add to Deck
// ========================================
router.post('/deck/add',
  (req, res, next) => middleware.validateDeckRequest(req, res, next),
  async (req, res) => {
  try {
    const {
      userId,
      word,
      phrase,
      contextSentence,
      translation,
      definition,
      cefrLevel,
      language = 'fr',
      sourceUrl,
      sourceTitle,
      tags = []
    } = req.body;

    const result = await pool.query(
      `INSERT INTO deck_cards
       (user_id, word, phrase, context_sentence, translation, definition, cefr_level, language, source_url, source_title, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [userId, word, phrase, contextSentence, translation, definition, cefrLevel, language, sourceUrl, sourceTitle, tags]
    );

    console.log(`✅ Added to deck: "${word}" for user ${userId}`);

    res.json({
      success: true,
      card: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error adding to deck:', error.message);
    res.status(500).json({ error: 'Failed to add to deck', message: error.message });
  }
});

// ========================================
// ENDPOINT: Get Deck
// ========================================
router.get('/deck/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    const result = await pool.query(
      'SELECT * FROM deck_cards WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM deck_cards WHERE user_id = $1',
      [userId]
    );

    res.json({
      cards: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('❌ Error fetching deck:', error.message);
    res.status(500).json({ error: 'Failed to fetch deck', message: error.message });
  }
});

// ========================================
// ENDPOINT: Delete from Deck
// ========================================
router.delete('/deck/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;

    const result = await pool.query(
      'DELETE FROM deck_cards WHERE id = $1 RETURNING *',
      [cardId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    console.log(`🗑️ Deleted card: ${cardId}`);

    res.json({ success: true, deleted: result.rows[0] });

  } catch (error) {
    console.error('❌ Error deleting card:', error.message);
    res.status(500).json({ error: 'Failed to delete card', message: error.message });
  }
});

// ========================================
// ENDPOINT: Export Deck
// ========================================
router.get('/deck/:userId/export', async (req, res) => {
  try {
    const { userId } = req.params;
    const { format = 'json' } = req.query;

    const result = await pool.query(
      'SELECT * FROM deck_cards WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    const cards = result.rows;

    if (format === 'csv') {
      // CSV export
      const csv = [
        'Word,Phrase,Context,Translation,Definition,CEFR Level,Language,Source URL,Created At',
        ...cards.map(c =>
          `"${c.word}","${c.phrase || ''}","${c.context_sentence || ''}","${c.translation || ''}","${c.definition || ''}","${c.cefr_level}","${c.language}","${c.source_url || ''}","${c.created_at}"`
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="deck-${userId}.csv"`);
      return res.send(csv);
    }

    if (format === 'anki') {
      // Anki-compatible CSV (Front, Back)
      const ankiCsv = [
        'Front,Back',
        ...cards.map(c => {
          const front = `${c.word}${c.phrase ? `<br><i>${c.phrase}</i>` : ''}`;
          const back = `${c.definition || ''}<br><br><b>Translation:</b> ${c.translation || ''}<br><b>Context:</b> ${c.context_sentence || ''}<br><b>Level:</b> ${c.cefr_level}`;
          return `"${front}","${back}"`;
        })
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="deck-${userId}-anki.csv"`);
      return res.send(ankiCsv);
    }

    // JSON export (default)
    res.json({
      userId,
      exportedAt: new Date().toISOString(),
      totalCards: cards.length,
      cards
    });

  } catch (error) {
    console.error('❌ Error exporting deck:', error.message);
    res.status(500).json({ error: 'Failed to export deck', message: error.message });
  }
});

module.exports = { router, init };
