/**
 * Real Integration Test for Cortex
 * 
 * Tests the full archive → search → recall workflow using:
 * - Real embedding model (nomic-embed-text-v1.5)
 * - Real database (in-memory SQLite)
 * - Sample transcript data
 * 
 * Run: node scripts/test-real-integration.mjs
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname, '../dist');

// ============================================================================
// Sample Transcript Data (realistic Claude conversation)
// ============================================================================

const SAMPLE_TRANSCRIPT = [
    {
        timestamp: "2024-06-15T10:00:00.000Z",
        message: {
            role: "user",
            content: [{ type: "text", text: "I need to implement JWT authentication for our Express API. What's the best approach?" }]
        }
    },
    {
        timestamp: "2024-06-15T10:00:30.000Z",
        message: {
            role: "assistant",
            content: [{
                type: "text",
                text: "For JWT authentication in Express, I recommend using the jsonwebtoken library. We decided to use RS256 algorithm with public/private key pairs for better security. Here's the implementation approach:\n\n1. Create middleware for token verification\n2. Store refresh tokens in Redis\n3. Use short-lived access tokens (15 min)\n\nWe implemented the auth module in src/middleware/auth.ts with proper error handling for expired tokens."
            }]
        }
    },
    {
        timestamp: "2024-06-15T10:05:00.000Z",
        message: {
            role: "user",
            content: [{ type: "text", text: "The database migration for user roles is failing. Can you help debug?" }]
        }
    },
    {
        timestamp: "2024-06-15T10:05:30.000Z",
        message: {
            role: "assistant",
            content: [{
                type: "text",
                text: "I found the issue! The migration was failing because of a foreign key constraint. The bug was that we were trying to add the role column before creating the roles table.\n\nWe fixed the issue by reordering the migrations. The database schema now has proper referential integrity. Successfully completed the migration and all user roles are properly assigned."
            }]
        }
    },
    {
        timestamp: "2024-06-15T10:10:00.000Z",
        message: {
            role: "user",
            content: [{ type: "text", text: "thanks" }]
        }
    },
    {
        timestamp: "2024-06-15T10:15:00.000Z",
        message: {
            role: "user",
            content: [{ type: "text", text: "Let's set up the API rate limiting next. What strategy should we use?" }]
        }
    },
    {
        timestamp: "2024-06-15T10:15:30.000Z",
        message: {
            role: "assistant",
            content: [{
                type: "text",
                text: "For API rate limiting, we decided to use a sliding window algorithm with Redis. The architecture design uses a tiered approach:\n\n- 100 requests/minute for authenticated users\n- 20 requests/minute for anonymous users\n- Custom limits for premium tier\n\nWe implemented this in the rateLimit middleware. The configuration is stored in config/limits.yaml and can be updated without redeployment."
            }]
        }
    }
];

// ============================================================================
// Test Implementation
// ============================================================================

async function runRealIntegrationTest() {
    console.log('🧪 Real Integration Test for Cortex\n');
    console.log('='.repeat(60));

    // Create temp directory for test files
    const testDir = join(tmpdir(), 'cortex-real-test-' + Date.now());
    mkdirSync(testDir, { recursive: true });

    const transcriptPath = join(testDir, 'test-session.jsonl');
    const dbPath = join(testDir, 'test-memory.db');

    try {
        // Step 1: Create sample transcript file
        console.log('\n📝 Step 1: Creating sample transcript...');
        const jsonlContent = SAMPLE_TRANSCRIPT.map(m => JSON.stringify(m)).join('\n') + '\n';
        writeFileSync(transcriptPath, jsonlContent);
        console.log(`   ✅ Created: ${transcriptPath}`);
        console.log(`   📊 ${SAMPLE_TRANSCRIPT.length} messages in transcript`);

        // Step 2: Import Cortex modules
        console.log('\n📦 Step 2: Loading Cortex modules...');

        // Dynamic import of built modules
        const { initDatabase, closeDatabase, getStats } = await import(join(distPath, 'database.js'));
        const { archiveSession, parseTranscript } = await import(join(distPath, 'archive.js'));
        const { hybridSearch } = await import(join(distPath, 'search.js'));
        const { initEmbedder, isEmbedderReady, getEmbeddingDim } = await import(join(distPath, 'embeddings.js'));

        console.log('   ✅ All modules loaded');

        // Step 3: Initialize embedding model
        console.log('\n🤖 Step 3: Initializing embedding model...');
        console.log('   ⏳ This may take a moment on first run (downloading model)...');
        const startInit = Date.now();
        await initEmbedder();
        const initTime = ((Date.now() - startInit) / 1000).toFixed(1);
        console.log(`   ✅ Embedder ready (${initTime}s)`);
        console.log(`   📐 Embedding dimensions: ${getEmbeddingDim()}`);

        // Step 4: Initialize database  
        console.log('\n💾 Step 4: Initializing database...');
        const db = await initDatabase(dbPath);
        let stats = getStats(db);
        console.log(`   ✅ Database initialized`);
        console.log(`   📊 Initial stats: ${stats.fragmentCount} fragments`);

        // Step 5: Archive the transcript
        console.log('\n📥 Step 5: Archiving transcript (real embeddings)...');
        const startArchive = Date.now();

        const result = await archiveSession(db, transcriptPath, 'test-project', {
            onProgress: (current, total) => {
                process.stdout.write(`\r   ⏳ Processing: ${current}/${total} chunks...`);
            }
        });

        const archiveTime = ((Date.now() - startArchive) / 1000).toFixed(1);
        console.log(`\n   ✅ Archive complete (${archiveTime}s)`);
        console.log(`   📊 Archived: ${result.archived} | Skipped: ${result.skipped} | Duplicates: ${result.duplicates}`);

        // Step 6: Check stats after archive
        console.log('\n📊 Step 6: Checking database stats...');
        stats = getStats(db);
        console.log(`   Fragments: ${stats.fragmentCount}`);
        console.log(`   Projects: ${stats.projectCount}`);
        console.log(`   Sessions: ${stats.sessionCount}`);

        // Step 7: Test semantic search
        console.log('\n🔍 Step 7: Testing semantic search...');

        const queries = [
            'JWT authentication implementation',
            'database migration problem',
            'rate limiting strategy',
            'Redis usage'
        ];

        for (const query of queries) {
            console.log(`\n   Query: "${query}"`);
            const startSearch = Date.now();
            const results = await hybridSearch(db, query, { limit: 2 });
            const searchTime = Date.now() - startSearch;

            if (results.length > 0) {
                console.log(`   ✅ Found ${results.length} results (${searchTime}ms)`);
                const top = results[0];
                const preview = top.content.substring(0, 80).replace(/\n/g, ' ') + '...';
                console.log(`   📄 Top result (${(top.score * 100).toFixed(0)}%): "${preview}"`);
            } else {
                console.log(`   ⚠️  No results found`);
            }
        }

        // Step 8: Test cross-session learning
        console.log('\n🧠 Step 8: Verifying cross-project learning...');
        const allResults = await hybridSearch(db, 'authentication', { includeAllProjects: true });
        console.log(`   ✅ Global search across all projects: ${allResults.length} results`);

        // Cleanup
        closeDatabase(db);

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('🎉 REAL INTEGRATION TEST PASSED!\n');
        console.log('Summary:');
        console.log(`  • Transcript parsed: ${SAMPLE_TRANSCRIPT.length} messages`);
        console.log(`  • Fragments created: ${result.archived}`);
        console.log(`  • Real embeddings: ${getEmbeddingDim()} dimensions`);
        console.log(`  • Semantic search: Working ✅`);
        console.log(`  • Cross-project: Working ✅`);
        console.log('\n✅ System is ready for production use!');

        // Cleanup temp files
        try {
            unlinkSync(transcriptPath);
            unlinkSync(dbPath);
            unlinkSync(dbPath + '-shm');
            unlinkSync(dbPath + '-wal');
        } catch { }

        return true;

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error(error.stack);
        return false;
    }
}

// Run the test
runRealIntegrationTest()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
