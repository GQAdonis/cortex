---
description: Search local memory for past context
allowed-tools: Bash
---

# Recall from Memory

Search Cortex for relevant past context using hybrid vector + keyword search.

## Step 1: Run Search Command

Execute the recall command with the user's query:

```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/index.js recall $ARGUMENTS
```

**Options:**
- `--all` or `--global`: Search across all projects instead of just current project

**Examples:**
```bash
# Search current project
node ${CLAUDE_PLUGIN_ROOT}/dist/index.js recall authentication flow

# Search all projects
node ${CLAUDE_PLUGIN_ROOT}/dist/index.js recall database schema --all
```

## Step 2: Display Results

The command outputs search results ranked by relevance:

```
[Cortex] Searching in my-project...

[1] Score: 0.847 | 2d ago
We implemented JWT authentication with refresh tokens...

[2] Score: 0.723 | 5d ago
The auth middleware validates tokens and attaches user...

Found 2 relevant memories
```

## Step 3: Incorporate Context

If results are found:
1. Read and understand the retrieved memories
2. Use relevant context to inform your response
3. Reference specific memories when applicable

If no results found:
- Inform the user: "No matching memories found for this query"
- Suggest: "Try broader search terms or use `--all` to search across projects"

## Search Algorithm

Cortex uses hybrid search:
1. **Vector Search**: Semantic similarity using BGE embeddings
2. **Keyword Search**: FTS5 full-text matching
3. **RRF Fusion**: Combines both with Reciprocal Rank Fusion (k=60)
4. **Recency Decay**: Recent memories scored higher (7-day half-life)

Returns top 5 results sorted by combined score.
