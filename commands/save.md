---
description: Archive current session context to local memory
allowed-tools: Bash, AskUserQuestion
---

# Save Session to Memory

Archive the current session's meaningful context to Cortex memory.

## Step 1: Run Archive Command

Execute the save command:

```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/index.js save
```

**Options:**
- `--global` or `--all`: Archive to global scope instead of project-specific

Example with global scope:
```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/index.js save --global
```

## Step 2: Display Results

The command outputs:
```
[Cortex] Archiving session to my-project...
[Cortex] Processing 15/15...
[Cortex] Archived 12 fragments (3 duplicates skipped)
```

Report to the user:
- Number of fragments archived
- Number of duplicates skipped (content already in memory)
- Project scope used

## Step 3: Offer Context Clear

Use AskUserQuestion to ask:
- Question: "Session archived. Would you like to clear the context now?"
- Options:
  - "Yes, clear context" - Run `/clear` to reset session
  - "No, keep context" - Continue with current session

## What Gets Archived

The archiver extracts meaningful content:
- User questions and requirements
- Assistant explanations and solutions
- Code snippets with context
- Important decisions and rationale

**Filtered out:**
- Tool invocations (Read, Bash, etc.)
- Repetitive content
- Very short messages (<50 chars by default)
