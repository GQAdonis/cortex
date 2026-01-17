# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Cortex is a Claude Code plugin that provides persistent local memory with cross-session recall. It uses vector embeddings and hybrid search to store and retrieve meaningful context from past sessions.

## Build Commands

```bash
npm install            # Install dependencies
npm run build          # Build TypeScript to dist/ using esbuild
npm run typecheck      # Type check without emitting

# Test with sample stdin data
echo '{"cwd":"/home/user/project","model":{"display_name":"Opus"},"context_window":{"context_window_size":200000,"used_percentage":45}}' | node dist/index.js stats
```

## Architecture

### Data Flow

```
Claude Code → stdin JSON → parse → command router → handler → stdout
                                        ↓
                               SQLite + Embeddings
                                        ↓
                              ~/.cortex/memory.db
```

### Core Components

| File | Purpose |
|------|---------|
| `src/index.ts` | Command router and handlers |
| `src/stdin.ts` | Parse Claude Code's JSON input |
| `src/types.ts` | TypeScript interfaces |
| `src/database.ts` | SQLite schema, queries, FTS5 |
| `src/embeddings.ts` | BGE model loading, vector generation |
| `src/search.ts` | Hybrid search (vector + keyword + RRF) |
| `src/archive.ts` | Transcript parsing, content extraction |
| `src/config.ts` | Configuration management |

### Database Schema

```sql
CREATE TABLE memories (
  id INTEGER PRIMARY KEY,
  content TEXT NOT NULL,
  content_hash TEXT UNIQUE,
  embedding BLOB NOT NULL,
  project_id TEXT,
  source_session TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE VIRTUAL TABLE memories_fts USING fts5(content);
```

### Search Algorithm

1. **Vector Search**: Query embedding vs stored embeddings (cosine similarity)
2. **Keyword Search**: FTS5 full-text search on content
3. **RRF Fusion**: Reciprocal Rank Fusion with k=60
4. **Recency Decay**: 7-day half-life for time weighting
5. **Result**: Top 5 sorted by combined score

### Stdin Format (Claude Code)

The plugin receives JSON via stdin from Claude Code:

```json
{
  "cwd": "/path/to/project",
  "transcript_path": "/path/to/session.jsonl",
  "model": {
    "id": "claude-opus-4-5-20251101",
    "display_name": "Opus"
  },
  "context_window": {
    "context_window_size": 200000,
    "current_usage": {
      "input_tokens": 45000,
      "cache_creation_input_tokens": 5000,
      "cache_read_input_tokens": 10000
    },
    "used_percentage": 45
  }
}
```

## Plugin Structure

```
cortex/
├── .claude-plugin/
│   └── plugin.json      # Plugin metadata
├── commands/
│   ├── setup.md         # /cortex-setup
│   ├── save.md          # /save
│   ├── recall.md        # /recall
│   ├── stats.md         # /cortex-stats
│   └── configure.md     # /cortex-configure
├── hooks/
│   └── hooks.json       # SessionStart, PostToolUse, PreCompact
├── src/                 # TypeScript source
├── dist/
│   ├── index.js         # Compiled entry point
│   └── sql-wasm.wasm    # SQLite WebAssembly
└── package.json
```

## Hooks

| Hook | Trigger | Purpose |
|------|---------|---------|
| `SessionStart` | New session begins | Show memory count for project |
| `PostToolUse` | After any tool | Monitor context usage |
| `PreCompact` | Before compaction | Auto-archive session |

## Configuration

Config file: `~/.cortex/config.json`

```json
{
  "statusline": {
    "enabled": true,
    "showFragments": true,
    "showLastArchive": true,
    "showContext": false,
    "contextWarningThreshold": 70
  },
  "archive": {
    "autoOnCompact": true,
    "projectScope": true,
    "minContentLength": 50
  },
  "monitor": {
    "tokenThreshold": 70
  }
}
```

## Dependencies

- **sql.js**: SQLite via WebAssembly (bundled)
- **@xenova/transformers**: ONNX embeddings (external)
- **@anthropic-ai/sdk**: API types (external)

## Development Notes

- Uses esbuild for bundling with external dependencies
- sql-wasm.wasm must be copied to dist/ during build
- Embedding model is downloaded on first use (~33MB)
- Database is persisted at ~/.cortex/memory.db
