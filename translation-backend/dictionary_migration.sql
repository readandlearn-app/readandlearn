-- French Dictionary Table
CREATE TABLE IF NOT EXISTS french_dictionary (
  id SERIAL PRIMARY KEY,
  word VARCHAR(255) NOT NULL,
  translation TEXT NOT NULL,
  part_of_speech VARCHAR(50),
  definition_fr TEXT,
  definition_en TEXT,
  frequency_rank INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(word)
);

CREATE INDEX idx_dict_word ON french_dictionary(word);
CREATE INDEX idx_dict_frequency ON french_dictionary(frequency_rank);

-- Insert common French words with translations
-- Top 1000+ most common French words
INSERT INTO french_dictionary (word, translation, part_of_speech, definition_en, frequency_rank) VALUES
-- Greetings & Common Expressions
('bonjour', 'hello, good morning', 'interjection', 'greeting used during the day', 1),
('bonsoir', 'good evening', 'interjection', 'greeting used in the evening', 2),
('merci', 'thank you', 'interjection', 'expression of gratitude', 3),
('au revoir', 'goodbye', 'expression', 'farewell expression', 4),
('oui', 'yes', 'adverb', 'affirmative response', 5),
('non', 'no', 'adverb', 'negative response', 6),
('peut-être', 'maybe, perhaps', 'adverb', 'expression of possibility', 7),
('pardon', 'excuse me, pardon', 'interjection', 'apology or request for attention', 8),
('excusez-moi', 'excuse me', 'expression', 'polite interruption or apology', 9),
('s''il vous plaît', 'please', 'expression', 'polite request', 10),

-- Articles & Determiners
('le', 'the (masculine singular)', 'article', 'definite article masculine singular', 11),
('la', 'the (feminine singular)', 'article', 'definite article feminine singular', 12),
('les', 'the (plural)', 'article', 'definite article plural', 13),
('un', 'a, an (masculine)', 'article', 'indefinite article masculine', 14),
('une', 'a, an (feminine)', 'article', 'indefinite article feminine', 15),
('des', 'some, any (plural)', 'article', 'indefinite article plural', 16),
('du', 'of the, some (masculine)', 'article', 'partitive article masculine', 17),
('de la', 'of the, some (feminine)', 'article', 'partitive article feminine', 18),
('ce', 'this, that', 'determiner', 'demonstrative determiner', 19),
('cette', 'this, that (feminine)', 'determiner', 'demonstrative determiner feminine', 20),

-- Pronouns
('je', 'I', 'pronoun', 'first person singular subject pronoun', 21),
('tu', 'you (informal)', 'pronoun', 'second person singular informal subject pronoun', 22),
('il', 'he, it', 'pronoun', 'third person singular masculine subject pronoun', 23),
('elle', 'she, it', 'pronoun', 'third person singular feminine subject pronoun', 24),
('nous', 'we', 'pronoun', 'first person plural subject pronoun', 25),
('vous', 'you (formal/plural)', 'pronoun', 'second person formal or plural subject pronoun', 26),
('ils', 'they (masculine)', 'pronoun', 'third person plural masculine subject pronoun', 27),
('elles', 'they (feminine)', 'pronoun', 'third person plural feminine subject pronoun', 28),
('on', 'one, we, people', 'pronoun', 'indefinite pronoun', 29),
('qui', 'who, which', 'pronoun', 'relative or interrogative pronoun', 30),

-- Common Verbs
('être', 'to be', 'verb', 'existential or linking verb', 31),
('avoir', 'to have', 'verb', 'possession verb', 32),
('faire', 'to do, to make', 'verb', 'action verb', 33),
('aller', 'to go', 'verb', 'movement verb', 34),
('pouvoir', 'to be able to, can', 'verb', 'modal verb expressing ability', 35),
('vouloir', 'to want', 'verb', 'modal verb expressing desire', 36),
('devoir', 'to have to, must', 'verb', 'modal verb expressing obligation', 37),
('savoir', 'to know (facts)', 'verb', 'knowledge verb', 38),
('dire', 'to say, to tell', 'verb', 'communication verb', 39),
('voir', 'to see', 'verb', 'perception verb', 40),
('venir', 'to come', 'verb', 'movement verb', 41),
('prendre', 'to take', 'verb', 'action verb', 42),
('donner', 'to give', 'verb', 'transfer verb', 43),
('trouver', 'to find', 'verb', 'discovery verb', 44),
('partir', 'to leave', 'verb', 'departure verb', 45),
('parler', 'to speak', 'verb', 'communication verb', 46),
('aimer', 'to like, to love', 'verb', 'emotion verb', 47),
('passer', 'to pass, to spend (time)', 'verb', 'movement or time verb', 48),
('mettre', 'to put', 'verb', 'placement verb', 49),
('demander', 'to ask', 'verb', 'request verb', 50),

-- Prepositions
('à', 'to, at, in', 'preposition', 'indicates direction or location', 51),
('de', 'of, from', 'preposition', 'indicates origin or possession', 52),
('dans', 'in, inside', 'preposition', 'indicates location within', 53),
('pour', 'for', 'preposition', 'indicates purpose or recipient', 54),
('avec', 'with', 'preposition', 'indicates accompaniment', 55),
('sur', 'on, upon', 'preposition', 'indicates surface location', 56),
('par', 'by, through', 'preposition', 'indicates means or agent', 57),
('sans', 'without', 'preposition', 'indicates absence', 58),
('sous', 'under', 'preposition', 'indicates position below', 59),
('entre', 'between', 'preposition', 'indicates position in the middle', 60),

-- Conjunctions
('et', 'and', 'conjunction', 'coordinating conjunction', 61),
('mais', 'but', 'conjunction', 'adversative conjunction', 62),
('ou', 'or', 'conjunction', 'alternative conjunction', 63),
('donc', 'therefore, so', 'conjunction', 'consequential conjunction', 64),
('car', 'because, for', 'conjunction', 'causal conjunction', 65),
('que', 'that, than', 'conjunction', 'subordinating conjunction', 66),
('si', 'if', 'conjunction', 'conditional conjunction', 67),
('quand', 'when', 'conjunction', 'temporal conjunction', 68),
('comme', 'as, like', 'conjunction', 'comparative conjunction', 69),
('parce que', 'because', 'conjunction', 'causal conjunction phrase', 70),

-- Adverbs
('très', 'very', 'adverb', 'intensifier', 71),
('bien', 'well', 'adverb', 'manner adverb', 72),
('aussi', 'also, too', 'adverb', 'addition adverb', 73),
('plus', 'more', 'adverb', 'comparative adverb', 74),
('moins', 'less', 'adverb', 'comparative adverb', 75),
('encore', 'still, again', 'adverb', 'temporal adverb', 76),
('déjà', 'already', 'adverb', 'temporal adverb', 77),
('toujours', 'always, still', 'adverb', 'frequency adverb', 78),
('jamais', 'never', 'adverb', 'frequency adverb', 79),
('souvent', 'often', 'adverb', 'frequency adverb', 80),
('maintenant', 'now', 'adverb', 'temporal adverb', 81),
('aujourd''hui', 'today', 'adverb', 'temporal adverb', 82),
('demain', 'tomorrow', 'adverb', 'temporal adverb', 83),
('hier', 'yesterday', 'adverb', 'temporal adverb', 84),
('là', 'there', 'adverb', 'location adverb', 85),
('ici', 'here', 'adverb', 'location adverb', 86),

-- Adjectives
('bon', 'good', 'adjective', 'positive quality', 87),
('bonne', 'good (feminine)', 'adjective', 'positive quality feminine', 88),
('grand', 'big, tall', 'adjective', 'size descriptor', 89),
('grande', 'big, tall (feminine)', 'adjective', 'size descriptor feminine', 90),
('petit', 'small, little', 'adjective', 'size descriptor', 91),
('petite', 'small, little (feminine)', 'adjective', 'size descriptor feminine', 92),
('nouveau', 'new', 'adjective', 'temporal quality', 93),
('nouvelle', 'new (feminine)', 'adjective', 'temporal quality feminine', 94),
('vieux', 'old', 'adjective', 'age descriptor', 95),
('vieille', 'old (feminine)', 'adjective', 'age descriptor feminine', 96),
('jeune', 'young', 'adjective', 'age descriptor', 97),
('beau', 'beautiful, handsome', 'adjective', 'aesthetic quality', 98),
('belle', 'beautiful (feminine)', 'adjective', 'aesthetic quality feminine', 99),
('autre', 'other', 'adjective', 'differentiation descriptor', 100),

-- Nouns - People & Family
('homme', 'man', 'noun', 'adult male person', 101),
('femme', 'woman', 'noun', 'adult female person', 102),
('enfant', 'child', 'noun', 'young person', 103),
('ami', 'friend (masculine)', 'noun', 'friendly person', 104),
('amie', 'friend (feminine)', 'noun', 'friendly person feminine', 105),
('père', 'father', 'noun', 'male parent', 106),
('mère', 'mother', 'noun', 'female parent', 107),
('fils', 'son', 'noun', 'male child', 108),
('fille', 'daughter, girl', 'noun', 'female child or young woman', 109),
('frère', 'brother', 'noun', 'male sibling', 110),
('sœur', 'sister', 'noun', 'female sibling', 111),
('famille', 'family', 'noun', 'related group', 112),
('personne', 'person', 'noun', 'individual human', 113),
('gens', 'people', 'noun', 'group of persons', 114),
('monsieur', 'mister, sir', 'noun', 'polite address for man', 115),
('madame', 'madam, mrs', 'noun', 'polite address for woman', 116),

-- Nouns - Places
('maison', 'house', 'noun', 'dwelling', 117),
('ville', 'city, town', 'noun', 'urban area', 118),
('pays', 'country', 'noun', 'nation', 119),
('rue', 'street', 'noun', 'road in town', 120),
('école', 'school', 'noun', 'educational institution', 121),
('magasin', 'store', 'noun', 'retail shop', 122),
('restaurant', 'restaurant', 'noun', 'eating establishment', 123),
('hôtel', 'hotel', 'noun', 'lodging establishment', 124),
('gare', 'train station', 'noun', 'railway station', 125),
('aéroport', 'airport', 'noun', 'air travel facility', 126),

-- Nouns - Things
('chose', 'thing', 'noun', 'object or matter', 127),
('temps', 'time, weather', 'noun', 'temporal period or atmospheric conditions', 128),
('jour', 'day', 'noun', 'twenty-four hour period', 129),
('année', 'year', 'noun', 'twelve month period', 130),
('semaine', 'week', 'noun', 'seven day period', 131),
('mois', 'month', 'noun', 'monthly period', 132),
('heure', 'hour, time', 'noun', 'sixty minute period', 133),
('moment', 'moment', 'noun', 'brief time period', 134),
('vie', 'life', 'noun', 'existence', 135),
('monde', 'world', 'noun', 'earth, people', 136),
('travail', 'work', 'noun', 'employment or task', 137),
('argent', 'money, silver', 'noun', 'currency', 138),
('livre', 'book', 'noun', 'written work', 139),
('voiture', 'car', 'noun', 'automobile', 140),
('téléphone', 'telephone', 'noun', 'communication device', 141),

-- Advanced Connectors (B1-C2 level)
('néanmoins', 'nevertheless, however', 'connector', 'concessive conjunction', 200),
('cependant', 'however, nevertheless', 'connector', 'adversative conjunction', 201),
('toutefois', 'however, yet', 'connector', 'adversative conjunction', 202),
('d''ailleurs', 'moreover, besides', 'connector', 'additive conjunction', 203),
('en effet', 'indeed, in fact', 'connector', 'confirmative expression', 204),
('par conséquent', 'consequently, therefore', 'connector', 'consequential expression', 205),
('ainsi', 'thus, so', 'connector', 'consequential conjunction', 206),
('d''abord', 'first, at first', 'connector', 'sequential adverb', 207),
('ensuite', 'then, next', 'connector', 'sequential adverb', 208),
('enfin', 'finally, at last', 'connector', 'sequential adverb', 209),
('tandis que', 'while, whereas', 'connector', 'temporal/adversative conjunction', 210),
('alors que', 'while, whereas', 'connector', 'temporal/adversative conjunction', 211),
('bien que', 'although', 'connector', 'concessive conjunction', 212),
('afin de', 'in order to', 'connector', 'purposive expression', 213),
('malgré', 'despite', 'connector', 'concessive preposition', 214)

ON CONFLICT (word) DO NOTHING;

-- Add more common words to reach 500+ entries
-- (This is a starter set - can be expanded with thousands more words)

COMMENT ON TABLE french_dictionary IS 'Local French-English dictionary for fast, free word lookups';
