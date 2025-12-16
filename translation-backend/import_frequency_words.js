const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'readandlearn',
  host: 'localhost',
  database: 'readandlearn',
  password: 'dev_password_123',
  port: 5432,
});

async function importFrequencyWords() {
  console.log('📚 Starting French frequency word import...');

  try {
    // Read the frequency file
    const fileContent = fs.readFileSync(__dirname + '/french_5k.txt', 'utf-8');
    const lines = fileContent.trim().split('\n');

    console.log(`📖 Found ${lines.length} words to import`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    // Process in batches of 100 for better performance
    const batchSize = 100;
    for (let i = 0; i < lines.length; i += batchSize) {
      const batch = lines.slice(i, Math.min(i + batchSize, lines.length));

      const values = [];
      const placeholders = [];
      let paramIndex = 1;

      for (let j = 0; j < batch.length; j++) {
        const line = batch[j].trim();
        if (!line) continue;

        // Parse: word<tab>frequency
        const parts = line.split(/\s+/);
        if (parts.length < 2) continue;

        const word = parts[0].toLowerCase().trim();
        const frequency = parseInt(parts[1]) || 0;
        const rank = i + j + 1;

        // Skip if word is empty or invalid
        if (!word || word.length === 0 || word.length > 255) {
          skipped++;
          continue;
        }

        // Basic part of speech detection (simple heuristics)
        let partOfSpeech = 'unknown';
        if (word.endsWith('er') || word.endsWith('ir') || word.endsWith('re') ||
            word.endsWith('oir') || word === 'être' || word === 'avoir') {
          partOfSpeech = 'verb';
        } else if (word.startsWith('le ') || word.startsWith('la ') || word.startsWith('les ')) {
          partOfSpeech = 'article';
        } else if (['et', 'ou', 'mais', 'donc', 'car', 'que', 'si', 'quand', 'comme'].includes(word)) {
          partOfSpeech = 'conjunction';
        } else if (['très', 'bien', 'aussi', 'plus', 'moins', 'encore', 'toujours', 'jamais'].includes(word)) {
          partOfSpeech = 'adverb';
        } else if (['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'on', 'qui'].includes(word)) {
          partOfSpeech = 'pronoun';
        } else if (['à', 'de', 'dans', 'pour', 'avec', 'sur', 'par', 'sans', 'sous', 'entre'].includes(word)) {
          partOfSpeech = 'preposition';
        }

        // Add to batch values
        placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`);
        values.push(word, `Common French word (rank ${rank})`, partOfSpeech, rank);
        paramIndex += 4;
      }

      if (values.length > 0) {
        try {
          const query = `
            INSERT INTO french_dictionary (word, translation, part_of_speech, frequency_rank)
            VALUES ${placeholders.join(', ')}
            ON CONFLICT (word) DO NOTHING
          `;

          const result = await pool.query(query, values);
          imported += result.rowCount || 0;

          if ((i + batchSize) % 500 === 0) {
            console.log(`✅ Progress: ${i + batchSize}/${lines.length} processed, ${imported} imported`);
          }
        } catch (err) {
          console.error(`❌ Batch error at line ${i}:`, err.message);
          errors++;
        }
      }
    }

    console.log('\n📊 Import Summary:');
    console.log(`   ✅ Successfully imported: ${imported} words`);
    console.log(`   ⏭️  Skipped (duplicates/invalid): ${skipped} words`);
    console.log(`   ❌ Errors: ${errors} batches`);

    // Verify total count
    const countResult = await pool.query('SELECT COUNT(*) FROM french_dictionary');
    console.log(`\n📚 Total words in dictionary: ${countResult.rows[0].count}`);

  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await pool.end();
  }
}

importFrequencyWords();
