// Input validation middleware
// Validates request bodies for various endpoints

const { sanitizeString, containsHtmlOrScript } = require('../utils/validation');

// Maximum text length configurable via environment (default: 50000 chars)
const MAX_TEXT_LENGTH = parseInt(process.env.MAX_TEXT_LENGTH) || 50000;

/**
 * Middleware: Validate POST /analyze requests
 */
function validateAnalyzeRequest(req, res, next) {
  const { text } = req.body;

  // Check text exists and is a string
  if (!text || typeof text !== 'string') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Text field is required and must be a string'
    });
  }

  const trimmedText = text.trim();

  // Check minimum length (10 chars)
  if (trimmedText.length < 10) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Text must be at least 10 characters long'
    });
  }

  // Check maximum length
  if (trimmedText.length > MAX_TEXT_LENGTH) {
    return res.status(400).json({
      error: 'Bad Request',
      message: `Text too long. Maximum ${MAX_TEXT_LENGTH} characters allowed (received ${trimmedText.length})`
    });
  }

  // Check text contains actual words (not just whitespace/symbols)
  const wordPattern = /[a-zA-Z\u00C0-\u024F]{2,}/; // At least one word with 2+ letters (including accented chars)
  if (!wordPattern.test(trimmedText)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Text must contain actual words, not just symbols or whitespace'
    });
  }

  next();
}

/**
 * Middleware: Validate POST /define requests
 */
function validateDefineRequest(req, res, next) {
  const { word } = req.body;

  // Check word exists and is a string
  if (!word || typeof word !== 'string') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Word field is required and must be a string'
    });
  }

  const trimmedWord = word.trim();

  // Check minimum length (1 char)
  if (trimmedWord.length < 1) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Word cannot be empty'
    });
  }

  // Check maximum length (100 chars)
  if (trimmedWord.length > 100) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Word too long. Maximum 100 characters allowed'
    });
  }

  // Check for HTML tags or script content
  if (containsHtmlOrScript(trimmedWord)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Word contains invalid characters (HTML or script content not allowed)'
    });
  }

  next();
}

/**
 * Middleware: Validate POST /deck/add requests
 */
function validateDeckRequest(req, res, next) {
  const { userId, word, translation, contextSentence } = req.body;

  // Check userId is present
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'userId is required and must be a string'
    });
  }

  // Check word is present
  if (!word || typeof word !== 'string') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Word is required and must be a string'
    });
  }

  // Sanitize string inputs
  req.body.userId = sanitizeString(userId);
  req.body.word = sanitizeString(word);
  if (translation) req.body.translation = sanitizeString(translation);
  if (contextSentence) req.body.contextSentence = sanitizeString(contextSentence);

  // Validate word doesn't contain malicious content
  if (containsHtmlOrScript(req.body.word)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Word contains invalid characters'
    });
  }

  next();
}

module.exports = {
  validateAnalyzeRequest,
  validateDefineRequest,
  validateDeckRequest,
  MAX_TEXT_LENGTH
};
