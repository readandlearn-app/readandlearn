// Embeddings service - Local ML embedding generation
// Uses Xenova/transformers for local embedding generation

// Local embedding model (lazy-loaded)
let embedder = null;

/**
 * Generate embedding locally using transformers
 * Uses Xenova/multilingual-e5-base for multilingual support
 * @param {string} text - Text to generate embedding for
 * @returns {Promise<number[]|null>} 768-dimensional embedding vector or null on error
 */
async function generateEmbedding(text) {
  try {
    // Lazy load the model (only once, ~5 seconds first time)
    if (!embedder) {
      console.log('📥 Loading local embedding model (one-time setup)...');
      try {
        const { pipeline } = await import('@xenova/transformers');
        embedder = await pipeline('feature-extraction', 'Xenova/multilingual-e5-base', {
          quantized: true  // Use quantized model for faster loading & less memory
        });
        console.log('✅ Embedding model loaded');
      } catch (importError) {
        console.error('❌ Failed to load embedding model (will skip similarity search):', importError.message);
        embedder = 'disabled'; // Mark as disabled to prevent retry
        return null;
      }
    }

    // If embedder was disabled due to previous error, skip
    if (embedder === 'disabled') {
      return null;
    }

    // Generate embedding (~300ms)
    const output = await embedder(text.substring(0, 512), {
      pooling: 'mean',
      normalize: true
    });

    // Convert to array (768 dimensions)
    return Array.from(output.data);
  } catch (error) {
    console.error('❌ Local embedding generation failed:', error.message);
    return null;
  }
}

/**
 * Initialize the embedder (optional - can be used to pre-load)
 */
async function initEmbedder() {
  if (!embedder || embedder === 'disabled') {
    await generateEmbedding('init'); // Trigger lazy load
  }
  return embedder !== 'disabled';
}

/**
 * Check if embedder is available
 */
function isEmbedderAvailable() {
  return embedder && embedder !== 'disabled';
}

module.exports = {
  generateEmbedding,
  initEmbedder,
  isEmbedderAvailable
};
