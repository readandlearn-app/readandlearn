-- Read and Learn Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Analyses cache table (for CEFR analysis results)
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text_hash VARCHAR(64) UNIQUE NOT NULL,
  url TEXT,
  language VARCHAR(10) DEFAULT 'fr',
  cefr_level VARCHAR(2),
  confidence VARCHAR(20),
  vocabulary_examples JSONB,
  grammar_features JSONB,
  reasoning TEXT,
  word_count INTEGER,
  analyzed_at TIMESTAMP DEFAULT NOW(),
  hit_count INTEGER DEFAULT 1,
  last_accessed TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analyses_text_hash ON analyses(text_hash);
CREATE INDEX idx_analyses_language ON analyses(language);
CREATE INDEX idx_analyses_accessed ON analyses(last_accessed);

-- Deck cards table (flashcards)
CREATE TABLE deck_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  word VARCHAR(255) NOT NULL,
  phrase TEXT,
  context_sentence TEXT,
  translation TEXT,
  definition TEXT,
  cefr_level VARCHAR(2),
  language VARCHAR(10) DEFAULT 'fr',
  source_url TEXT,
  source_title TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  review_count INTEGER DEFAULT 0,
  tags TEXT[]
);

CREATE INDEX idx_deck_user_id ON deck_cards(user_id);
CREATE INDEX idx_deck_word ON deck_cards(word);
CREATE INDEX idx_deck_language ON deck_cards(language);
CREATE INDEX idx_deck_created ON deck_cards(created_at DESC);

-- Deck statistics
CREATE TABLE deck_stats (
  user_id VARCHAR(255) PRIMARY KEY,
  total_cards INTEGER DEFAULT 0,
  cards_added_today INTEGER DEFAULT 0,
  last_activity TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Usage log (analytics)
CREATE TABLE usage_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(50) NOT NULL,
  language VARCHAR(10),
  timestamp TIMESTAMP DEFAULT NOW(),
  cache_hit BOOLEAN DEFAULT FALSE,
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6)
);

CREATE INDEX idx_usage_timestamp ON usage_log(timestamp DESC);
CREATE INDEX idx_usage_action ON usage_log(action);

-- Vocabulary cache (for word definitions)
CREATE TABLE vocabulary_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  word VARCHAR(255) NOT NULL,
  language VARCHAR(10) DEFAULT 'fr',
  definition TEXT,
  translation TEXT,
  cefr_level VARCHAR(2),
  word_type VARCHAR(50),
  examples JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(word, language)
);

CREATE INDEX idx_vocab_word_lang ON vocabulary_cache(word, language);

-- Learned dictionary (AI-learned words)
CREATE TABLE learned_dictionary (
  id SERIAL PRIMARY KEY,
  word VARCHAR(255) NOT NULL,
  translation TEXT NOT NULL,
  part_of_speech VARCHAR(50),
  definition_en TEXT,
  learned_at TIMESTAMP DEFAULT NOW(),
  learn_count INTEGER DEFAULT 1,
  UNIQUE(word)
);

CREATE INDEX idx_learned_word ON learned_dictionary(word);

COMMENT ON TABLE learned_dictionary IS 'Words learned from AI that were not in the frequency list';

-- Article Embeddings table for semantic similarity
CREATE TABLE article_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT UNIQUE NOT NULL,
  url_hash VARCHAR(64) NOT NULL,
  title TEXT,
  text_preview TEXT,
  embedding vector(768),
  cefr_level VARCHAR(2),
  word_count INTEGER,
  language VARCHAR(10) DEFAULT 'fr',
  analyzed_at TIMESTAMP DEFAULT NOW(),
  last_accessed TIMESTAMP DEFAULT NOW(),
  access_count INTEGER DEFAULT 1
);

CREATE INDEX idx_article_url_hash ON article_embeddings(url_hash);
CREATE INDEX idx_article_cefr ON article_embeddings(cefr_level);
CREATE INDEX idx_article_language ON article_embeddings(language);
CREATE INDEX idx_article_embedding ON article_embeddings USING hnsw (embedding vector_cosine_ops);

COMMENT ON TABLE article_embeddings IS 'Stores article embeddings for semantic similarity search and URL-based caching';

-- Comprehension questions table (DELF/DALF exam-style questions)
CREATE TABLE comprehension_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url TEXT NOT NULL,
  url_hash VARCHAR(64) NOT NULL,
  article_text_hash VARCHAR(64) NOT NULL,
  exam_type VARCHAR(20) NOT NULL,           -- 'DELF' or 'DALF'
  level VARCHAR(10) NOT NULL,               -- 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'
  questions JSONB NOT NULL,                 -- Array of 10 question objects
  generated_at TIMESTAMP DEFAULT NOW(),
  last_accessed TIMESTAMP DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  language VARCHAR(10) DEFAULT 'fr'
);

CREATE INDEX idx_questions_url_hash_level ON comprehension_questions(url_hash, level);
CREATE INDEX idx_questions_text_hash ON comprehension_questions(article_text_hash);
CREATE INDEX idx_questions_level ON comprehension_questions(level);
CREATE INDEX idx_questions_exam_type ON comprehension_questions(exam_type);

COMMENT ON TABLE comprehension_questions IS 'Stores generated DELF/DALF comprehension questions, cached by URL + level';

-- Comprehension deck table (user-saved questions for practice/export)
CREATE TABLE comprehension_deck (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  question_set_id UUID REFERENCES comprehension_questions(id),
  question_data JSONB NOT NULL,            -- Full question object with user's answer
  level VARCHAR(10) NOT NULL,
  exam_type VARCHAR(20) NOT NULL,
  source_url TEXT,
  source_title TEXT,
  added_at TIMESTAMP DEFAULT NOW(),
  user_score INTEGER,                      -- User's score on this question set (0-10)
  review_count INTEGER DEFAULT 0,
  last_reviewed TIMESTAMP
);

CREATE INDEX idx_comp_deck_user ON comprehension_deck(user_id);
CREATE INDEX idx_comp_deck_level ON comprehension_deck(level);
CREATE INDEX idx_comp_deck_exam_type ON comprehension_deck(exam_type);
CREATE INDEX idx_comp_deck_question_set ON comprehension_deck(question_set_id);

COMMENT ON TABLE comprehension_deck IS 'User-saved comprehension question sets for Anki export and practice tracking';

-- Function to update last_accessed timestamp
CREATE OR REPLACE FUNCTION update_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed = NOW();
  NEW.hit_count = OLD.hit_count + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for analyses cache hit tracking
CREATE TRIGGER trigger_update_last_accessed
BEFORE UPDATE ON analyses
FOR EACH ROW
WHEN (OLD.text_hash = NEW.text_hash)
EXECUTE FUNCTION update_last_accessed();

-- Function to update deck stats
CREATE OR REPLACE FUNCTION update_deck_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO deck_stats (user_id, total_cards, cards_added_today, last_activity)
  VALUES (NEW.user_id, 1, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET total_cards = deck_stats.total_cards + 1,
      cards_added_today = CASE
        WHEN DATE(deck_stats.last_activity) = CURRENT_DATE
        THEN deck_stats.cards_added_today + 1
        ELSE 1
      END,
      last_activity = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for deck card insertion
CREATE TRIGGER trigger_update_deck_stats
AFTER INSERT ON deck_cards
FOR EACH ROW
EXECUTE FUNCTION update_deck_stats();

-- Seed some test data (optional)
INSERT INTO usage_log (action, language, cache_hit, tokens_used, cost_usd)
VALUES ('initialization', 'system', FALSE, 0, 0.0);

COMMENT ON TABLE analyses IS 'Caches CEFR analysis results to avoid redundant API calls';
COMMENT ON TABLE deck_cards IS 'User flashcard decks for vocabulary learning';
COMMENT ON TABLE vocabulary_cache IS 'Caches word definitions to reduce API costs';
COMMENT ON TABLE usage_log IS 'Tracks API usage and costs for analytics';
