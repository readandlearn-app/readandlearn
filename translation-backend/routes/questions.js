// Comprehension questions routes
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
// ENDPOINT: Generate Comprehension Questions
// ========================================
router.post('/questions/generate',
  (req, res, next) => middleware.requireValidApiKey(req, res, next),
  async (req, res) => {
  const { text, url, level, examType } = req.body;

  if (!text || !url || !level || !examType) {
    return res.status(400).json({ error: 'Missing required fields: text, url, level, examType' });
  }

  console.log('\n========================================');
  console.log('📝 POST /questions/generate');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Exam: ${examType} ${level}`);
  console.log(`URL: ${url}`);

  try {
    const urlHash = services.calculateHash(url);
    const textHash = services.calculateHash(text);

    // Check cache first
    const cached = await pool.query(
      `SELECT * FROM comprehension_questions
       WHERE url_hash = $1 AND level = $2 AND exam_type = $3
       LIMIT 1`,
      [urlHash, level, examType]
    );

    if (cached.rows.length > 0) {
      console.log('💾 CACHE HIT! Returning cached questions');

      // Update access count
      await pool.query(
        `UPDATE comprehension_questions
         SET access_count = access_count + 1, last_accessed = NOW()
         WHERE id = $1`,
        [cached.rows[0].id]
      );

      return res.json({
        questions: cached.rows[0].questions,
        questionSetId: cached.rows[0].id,
        cached: true,
        tokens: 0,
        cost: 0
      });
    }

    console.log('❌ CACHE MISS - Generating new questions with AI...');

    // Sample text if too long
    const { text: sampledText, sampled } = services.smartSample(text, 1000);
    console.log(`📄 Text: ${text.split(/\s+/).length} words → ${sampledText.split(/\s+/).length} words (sampled: ${sampled})`);

    // Call AI to generate questions
    const prompt = `Tu es un expert en création de questions de compréhension pour les examens ${examType} niveau ${level}.

Génère exactement 10 questions de compréhension basées sur ce texte français. Les questions doivent être variées et inclure différents types:
- Choix multiples (QCM) avec 4 options
- Vrai/Faux
- Questions à remplir (complément)
- Questions d'association (matching)
- Réponses courtes

Texte à analyser:
${sampledText}

IMPORTANT:
- Toutes les questions et explications doivent être en français
- Les questions doivent correspondre au niveau ${examType} ${level}
- Mélange les types de questions
- Fournis la bonne réponse et une explication pour chaque question

Format JSON requis:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Question ici?",
      "options": {
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      },
      "correct_answer": "B",
      "explanation": "Explication en français"
    },
    {
      "id": 2,
      "type": "true_false",
      "question": "Affirmation ici",
      "correct_answer": "Vrai",
      "explanation": "Explication"
    },
    {
      "id": 3,
      "type": "fill_blank",
      "question": "Le gouvernement a annoncé des _____ fiscales.",
      "correct_answer": "réductions",
      "explanation": "Explication"
    }
  ]
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('AI API error details:', JSON.stringify(errorData, null, 2));
      throw new Error(`AI API error: ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const questionsText = data.content[0].text;

    // Parse JSON response
    let questionsData;
    try {
      questionsData = JSON.parse(questionsText);
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = questionsText.match(/```json\n([\s\S]*?)\n```/) || questionsText.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        questionsData = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Failed to parse questions JSON from AI response');
      }
    }

    const tokens = data.usage.input_tokens + data.usage.output_tokens;
    const cost = (data.usage.input_tokens * 0.00025 + data.usage.output_tokens * 0.00125) / 1000;

    console.log(`💰 Tokens: ${data.usage.input_tokens} in + ${data.usage.output_tokens} out = $${cost.toFixed(6)}`);
    console.log(`✅ Generated ${questionsData.questions.length} questions`);

    // Store in database
    const insertResult = await pool.query(
      `INSERT INTO comprehension_questions
       (url, url_hash, article_text_hash, exam_type, level, questions, language)
       VALUES ($1, $2, $3, $4, $5, $6, 'fr')
       RETURNING id`,
      [url, urlHash, textHash, examType, level, JSON.stringify(questionsData.questions)]
    );

    const questionSetId = insertResult.rows[0].id;

    // Log usage
    await pool.query(
      `INSERT INTO usage_log (action, language, cache_hit, tokens_used, cost_usd)
       VALUES ($1, $2, $3, $4, $5)`,
      ['generate_questions', 'fr', false, tokens, cost]
    );

    res.json({
      questions: questionsData.questions,
      questionSetId,
      cached: false,
      tokens,
      cost: parseFloat(cost.toFixed(6))
    });

  } catch (error) {
    console.error('❌ Error generating questions:', error);
    res.status(500).json({ error: 'Failed to generate questions', message: error.message });
  }
});

// ========================================
// ENDPOINT: Add Questions to Deck
// ========================================
router.post('/questions/deck/add', async (req, res) => {
  const { userId, questionSetId, questions, level, examType, sourceUrl, sourceTitle, userScore } = req.body;

  if (!userId || !questionSetId || !questions) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    console.log(`💾 Adding question set to deck for user ${userId}`);

    await pool.query(
      `INSERT INTO comprehension_deck
       (user_id, question_set_id, question_data, level, exam_type, source_url, source_title, user_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, questionSetId, JSON.stringify(questions), level, examType, sourceUrl, sourceTitle, userScore]
    );

    res.json({ success: true, message: 'Questions added to deck' });

  } catch (error) {
    console.error('❌ Error adding to deck:', error);
    res.status(500).json({ error: 'Failed to add to deck', message: error.message });
  }
});

// ========================================
// ENDPOINT: Get User's Comprehension Deck
// ========================================
router.get('/questions/deck/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM comprehension_deck
       WHERE user_id = $1
       ORDER BY added_at DESC`,
      [userId]
    );

    res.json({
      sets: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('❌ Error fetching deck:', error);
    res.status(500).json({ error: 'Failed to fetch deck', message: error.message });
  }
});

// ========================================
// ENDPOINT: Export Comprehension Questions
// ========================================
router.get('/questions/deck/:userId/export', async (req, res) => {
  const { userId } = req.params;
  const { format } = req.query;

  try {
    const result = await pool.query(
      `SELECT * FROM comprehension_deck
       WHERE user_id = $1
       ORDER BY added_at DESC`,
      [userId]
    );

    if (format === 'anki') {
      // Anki CSV format
      let csv = 'Front,Back,Level,ExamType,Source\n';

      for (const set of result.rows) {
        const questions = JSON.parse(set.question_data);

        for (const q of questions) {
          let front = q.question;

          // Add options for multiple choice
          if (q.type === 'multiple_choice' && q.options) {
            front += '<br><br>';
            for (const [key, value] of Object.entries(q.options)) {
              front += `${key}. ${value}<br>`;
            }
          }

          let back = q.correct_answer;
          if (q.explanation) {
            back += `<br><br>${q.explanation}`;
          }

          const level = set.level || '';
          const examType = set.exam_type || '';
          const source = set.source_url || '';

          csv += `"${front}","${back}","${level}","${examType}","${source}"\n`;
        }
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="comprehension-deck-${userId}.csv"`);
      res.send(csv);

    } else {
      // JSON format
      res.json({
        deck_name: `French Comprehension - ${userId}`,
        total_sets: result.rows.length,
        sets: result.rows
      });
    }

  } catch (error) {
    console.error('❌ Error exporting deck:', error);
    res.status(500).json({ error: 'Failed to export deck', message: error.message });
  }
});

module.exports = { router, init };
