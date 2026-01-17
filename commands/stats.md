---
description: Display Cortex memory statistics
allowed-tools: Bash
---

# Memory Statistics

Display comprehensive Cortex memory statistics.

## Run Stats Command

Execute the stats command:

```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/index.js stats
```

## Expected Output

```
Cortex Memory Stats
------------------------
  Fragments: 247
  Projects:  5
  Sessions:  23
  DB Size:   4.2 MB
  Model:     Xenova/bge-small-en-v1.5
  Oldest:    12/15/2024
  Newest:    1/17/2025

Project: my-project
  Fragments: 47
  Sessions:  8
  Last Save: 2h ago
```

## Statistics Explained

**Global Stats:**
- **Fragments**: Total memory chunks stored across all projects
- **Projects**: Number of distinct projects with memories
- **Sessions**: Number of archived sessions
- **DB Size**: SQLite database file size
- **Model**: Embedding model used for vector search
- **Oldest/Newest**: Date range of stored memories

**Project Stats** (when run from a project directory):
- **Fragments**: Memories specific to current project
- **Sessions**: Archived sessions for this project
- **Last Save**: Time since last archive operation

## Display to User

Present the statistics in a clear format. If the database is empty, suggest running `/cortex-setup` first.
