---
name: cortex-setup
description: Initialize Cortex for first-time use
allowed-tools: Bash, Write, Read, AskUserQuestion
user-invocable: true
---

# Cortex Setup Wizard

Initialize Cortex for first-time use.

## Setup Steps

### 1. Initialize System

Run the internal setup command to create directories and database:

```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/index.js setup
```

### 2. Configure Preferences

Ask the user to choose a configuration preset:

**Question:** How would you like Cortex to behave?

1. **Full Automation (Recommended)**
   - **Protection**: Saves seamlessly while you work (every 5% context).
   - **Clear Safety**: Automatically saves backup before you clear context.
   - **Visuals**: Shows "Saved" notifications.

2. **Balanced**
   - **Protection**: Saves less frequently (every 10%).
   - **Clear Safety**: Automatically saves backup before clear.
   - **Visuals**: Standard status bar.

3. **Silent Mode**
   - **Protection**: **Manual saving only**.
   - **Clear Safety**: Automatically saves backup before clear.
   - **Visuals**: Hidden status bar.

### 3. Apply Preset

Based on the user's choice (1, 2, or 3), apply the corresponding preset:

**If "1" or "Full":**
```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/index.js configure full
```

**If "2" or "Balanced":**
```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/index.js configure essential
```

**If "3" or "Silent":**
```bash
node ${CLAUDE_PLUGIN_ROOT}/dist/index.js configure minimal
```

### 4. Finish

Print the success message:
"✅ Cortex is ready! Restart Claude Code for the statusline to appear."
