#!/usr/bin/env node
/**
 * Test script to verify embedding model download and functionality
 * Run: node scripts/test-embedding.mjs
 */

import { pipeline, env } from '@xenova/transformers';

// Disable local model check to force download
env.allowLocalModels = false;

const MODEL_NAME = 'nomic-ai/nomic-embed-text-v1.5';

async function main() {
    console.log('🚀 Testing nomic-embed-text-v1.5 embedding model...\n');
    console.log('📥 Loading model (will download on first run, ~500MB)...');

    const startTime = Date.now();

    try {
        // Load the embedding pipeline
        const extractor = await pipeline('feature-extraction', MODEL_NAME, {
            quantized: true, // Use quantized version for faster inference
        });

        const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Model loaded in ${loadTime}s\n`);

        // Test embedding
        const testText = 'This is a test sentence for embedding.';
        console.log(`📝 Test text: "${testText}"`);

        const embedStart = Date.now();
        const output = await extractor(testText, { pooling: 'mean', normalize: true });
        const embedTime = ((Date.now() - embedStart) / 1000).toFixed(3);

        // Get the embedding array
        const embedding = Array.from(output.data);

        console.log(`\n✅ Embedding generated in ${embedTime}s`);
        console.log(`📊 Dimensions: ${embedding.length}`);
        console.log(`📊 First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(6)).join(', ')}]`);
        console.log(`📊 Norm: ${Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0)).toFixed(6)}`);

        // Verify dimensions
        if (embedding.length === 768) {
            console.log('\n✅ SUCCESS: Embedding has correct 768 dimensions!');
        } else {
            console.log(`\n❌ UNEXPECTED: Embedding has ${embedding.length} dimensions (expected 768)`);
        }

        console.log('\n🎉 Model is ready for use in Cortex plugin!');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
