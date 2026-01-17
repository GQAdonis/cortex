---
description: Configure Cortex settings with presets
allowed-tools: Bash, AskUserQuestion
---

# Configure Cortex

Configure Cortex behavior using presets.

## Step 1: Choose Preset

If no preset specified in arguments, use AskUserQuestion:

- Question: "Choose a Cortex configuration preset:"
- Options:
  - "Full (Recommended)" - All features enabled
  - "Essential" - Statusline and auto-archive only
  - "Minimal" - Commands only, no automation

## Step 2: Apply Configuration

Execute with the chosen preset:

```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/index.js configure $ARGUMENTS
```

**Available presets:**

| Preset | Statusline | Auto-Archive | Context Warnings |
|--------|------------|--------------|------------------|
| `full` | Enabled | Enabled | 70% threshold |
| `essential` | Enabled | Enabled | Disabled |
| `minimal` | Disabled | Disabled | Disabled |

## Step 3: Confirm Changes

The command outputs:
```
[Cortex] Applied "full" preset

Configuration:
  Statusline: enabled
  Auto-archive: enabled
  Context warning: 70%
```

## Preset Details

**Full** (recommended for most users):
- Statusline shows fragment count, project, last archive time
- Auto-archive triggers before context compaction
- Context warning at 70% usage

**Essential** (for minimal UI):
- Statusline with basic info
- Auto-archive enabled
- No context warnings

**Minimal** (commands only):
- No statusline output
- No automatic archiving
- Use `/save` and `/recall` manually

## Configuration File

Settings are stored in `~/.cortex/config.json`. The preset command overwrites this file with preset defaults.
