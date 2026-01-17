---
description: Initialize Cortex for first-time use
allowed-tools: Bash
---

# Setup Cortex

Initialize Cortex for first-time use.

## Step 1: Run Setup

Execute the setup command:

```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/index.js setup
```

This will:
- Create the data directory (`~/.cortex`)
- Initialize the SQLite database with FTS5 full-text search
- Download and cache the embedding model (BGE-small, ~33MB on first run)
- Verify everything is working correctly

## Step 2: Verify Output

The setup should output:
```
[Cortex] Setting up Cortex...
  ✓ Data directory: ~/.cortex
  ✓ Database initialized
  ⏳ Loading embedding model (first run may take a minute)...
  ✓ Model loaded: Xenova/bge-small-en-v1.5 (384d)

[Cortex] Setup complete!
```

## Step 3: Confirm Success

If setup completes successfully, inform the user:
- `/save` - Archive current session to memory
- `/recall <query>` - Search memories for relevant context
- `/cortex-stats` - View memory statistics

## Troubleshooting

**If model download fails:**
- Check internet connectivity
- The model is cached at `~/.cache/huggingface/`
- Re-run `/cortex-setup` to retry

**If database initialization fails:**
- Check write permissions to `~/.cortex/`
- Ensure Node.js 18+ is installed
