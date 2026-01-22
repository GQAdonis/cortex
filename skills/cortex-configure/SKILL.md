---
name: cortex-configure
description: Configure Cortex settings with presets
allowed-tools: Bash, Write, Read, AskUserQuestion
user-invocable: true
---

# Cortex Configure

Adjust Cortex settings after initial setup.

## Configuration Options

### Presets

Offer quick presets for common configurations:

**Full** - All features enabled
- Statusline: enabled
- Auto-archive: enabled
- Auto-save threshold: 70%

**Essential** - Core features only
- Statusline: enabled
- Auto-archive: enabled
- Auto-save threshold: 75%

**Minimal** - Commands only
- Statusline: disabled
- Auto-archive: disabled
- Auto-save threshold: 85%

### Individual Settings

Allow fine-tuning of specific settings:

1. **Auto-save Threshold** (0-100%)
   - When to automatically save context
   - Default: 70%

2. **Restoration Token Budget** (number)
   - Max tokens for restoration context
   - Default: 2000

3. **Restoration Message Count** (number)
   - Number of messages to restore
   - Default: 5

4. **Statusline Enabled** (true/false)
   - Show Cortex in status line
   - Default: true

## Usage Flow

1. Ask user what they want to configure:
   - Apply a preset
   - Adjust specific settings

2. If preset: Apply using `node dist/index.js configure <preset>`

3. If specific settings:
   - Read current config from `~/.cortex/config.json`
   - Ask about specific setting to change
   - Update and save config

4. Confirm changes applied

## Configuration File

Location: `~/.cortex/config.json`

```json
{
  "statusline": {
    "enabled": true,
    "showFragments": true,
    "showLastArchive": true,
    "showContext": true
  },
  "archive": {
    "autoOnCompact": true,
    "projectScope": true,
    "minContentLength": 50
  },
  "automation": {
    "autoSaveThreshold": 70,
    "restorationTokenBudget": 2000,
    "restorationMessageCount": 5
  }
}
```
