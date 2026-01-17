/**
 * Cortex Embeddings Module
 * Vector generation using @xenova/transformers (pure JS ONNX runtime)
 */

// ============================================================================
// Configuration
// ============================================================================

const MODEL_NAME = 'Xenova/bge-small-en-v1.5';
const EMBEDDING_DIM = 384;

// Prefixes for BGE models
const PASSAGE_PREFIX = 'passage: ';
const QUERY_PREFIX = 'query: ';

// ============================================================================
// Embedder State
// ============================================================================

// Use 'any' for dynamic import
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embedder: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let initPromise: Promise<any> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pipelineFunc: any = null;

/**
 * Dynamically import @xenova/transformers (ESM-only package)
 */
async function loadTransformers() {
  if (pipelineFunc) return pipelineFunc;

  // Use dynamic import for ESM-only package
  const transformers = await import('@xenova/transformers');
  pipelineFunc = transformers.pipeline;
  return pipelineFunc;
}

/**
 * Initialize the embedding pipeline
 * Uses singleton pattern to avoid loading model multiple times
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function initEmbedder(): Promise<any> {
  if (embedder) {
    return embedder;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const pipeline = await loadTransformers();
      embedder = await pipeline('feature-extraction', MODEL_NAME, {
        quantized: true,
      });
      return embedder;
    } catch (error) {
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Check if embedder is initialized
 */
export function isEmbedderReady(): boolean {
  return embedder !== null;
}

/**
 * Get embedding dimension
 */
export function getEmbeddingDim(): number {
  return EMBEDDING_DIM;
}

/**
 * Get model name
 */
export function getModelName(): string {
  return MODEL_NAME;
}

// ============================================================================
// Embedding Functions
// ============================================================================

/**
 * Generate embeddings for passages (content to be stored)
 * Uses "passage: " prefix as per BGE model convention
 */
export async function embedPassages(texts: string[]): Promise<Float32Array[]> {
  const pipe = await initEmbedder();

  const prefixedTexts = texts.map((t) => PASSAGE_PREFIX + t);

  const results: Float32Array[] = [];

  for (const text of prefixedTexts) {
    const output = await pipe(text, {
      pooling: 'mean',
      normalize: true,
    });

    // Extract embedding from tensor
    const embedding = new Float32Array(output.data);
    results.push(embedding);
  }

  return results;
}

/**
 * Generate embedding for a single passage
 */
export async function embedPassage(text: string): Promise<Float32Array> {
  const results = await embedPassages([text]);
  return results[0];
}

/**
 * Generate embedding for a search query
 * Uses "query: " prefix as per BGE model convention
 */
export async function embedQuery(text: string): Promise<Float32Array> {
  const pipe = await initEmbedder();

  const prefixedText = QUERY_PREFIX + text;

  const output = await pipe(prefixedText, {
    pooling: 'mean',
    normalize: true,
  });

  return new Float32Array(output.data);
}

/**
 * Generate embeddings in batches with progress callback
 */
export async function embedBatch(
  texts: string[],
  options: {
    batchSize?: number;
    onProgress?: (completed: number, total: number) => void;
    isQuery?: boolean;
  } = {}
): Promise<Float32Array[]> {
  const { batchSize = 32, onProgress, isQuery = false } = options;
  const prefix = isQuery ? QUERY_PREFIX : PASSAGE_PREFIX;

  const pipe = await initEmbedder();
  const results: Float32Array[] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const prefixedBatch = batch.map((t) => prefix + t);

    for (const text of prefixedBatch) {
      const output = await pipe(text, {
        pooling: 'mean',
        normalize: true,
      });
      results.push(new Float32Array(output.data));
    }

    if (onProgress) {
      onProgress(Math.min(i + batchSize, texts.length), texts.length);
    }
  }

  return results;
}

// ============================================================================
// Testing / Verification
// ============================================================================

/**
 * Test embedding generation
 */
export async function testEmbed(text: string): Promise<{
  model: string;
  dimensions: number;
  sample: number[];
}> {
  const embedding = await embedPassage(text);

  return {
    model: MODEL_NAME,
    dimensions: embedding.length,
    sample: Array.from(embedding.slice(0, 5)),
  };
}

/**
 * Verify model is loaded and working
 */
export async function verifyModel(): Promise<{
  success: boolean;
  model: string;
  dimensions: number;
  error?: string;
}> {
  try {
    await initEmbedder();

    const testEmbedding = await embedPassage('test');

    return {
      success: true,
      model: MODEL_NAME,
      dimensions: testEmbedding.length,
    };
  } catch (error) {
    return {
      success: false,
      model: MODEL_NAME,
      dimensions: EMBEDDING_DIM,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
