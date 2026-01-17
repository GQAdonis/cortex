# Cortex v2.0

Persistent local memory for Claude Code. Longer sessions. Cross-session recall. Zero cloud.

**Now pure TypeScript - no Python dependencies required.**

## Why?

- **Session limits hit mid-task** - Proactive warnings + archive before threshold
- **`/clear` wipes everything** - Memory survives
- **Re-explaining every session** - `/recall` brings back context
- **Cloud memory concerns** - SQLite file you own, backup, delete

## Install

```bash
git clone https://github.com/hjertefolger/cortex.git
cd cortex
npm install
npm run build
```

Add the plugin to Claude Code:
```bash
claude plugin add ./cortex
```

Then in Claude Code:
```
/cortex-setup
```

## Usage

```
/save              # Archive current context
/recall auth       # Find past work on authentication
/recall --all api  # Search all projects
/cortex-stats      # View memory statistics
/cortex-configure  # Configure settings
```

## How It Works

- **SQLite (sql.js)**: Pure JS database via WebAssembly
- **@xenova/transformers**: Quantized ONNX embeddings (~33MB)
- **Hybrid Search**: Vector similarity + keyword matching
- **Project Scoping**: Memories organized by project
- **Recency Decay**: Recent memories rank higher

## Features

### Statusline
Real-time memory stats in your Claude Code statusline:
```
[Cortex] 47 frags | my-project | Last: 2m ago
```

### Auto-Archive
Automatically archives context before compaction when enabled.

### Configuration Presets
```
/cortex-configure full       # All features
/cortex-configure essential  # Statusline + auto-archive
/cortex-configure minimal    # Commands only
```

## Requirements

- Node.js 18+
- Claude Code v2.0.12+
- ~50MB disk space

## Data Location

All data stored locally in `~/.cortex/`:
- `memory.db` - SQLite database
- `config.json` - Configuration

## License

MIT
