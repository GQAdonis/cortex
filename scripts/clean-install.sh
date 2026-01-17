#!/bin/bash
# Cortex Clean Install Script
# Removes database, cached models, and plugin registration for a fresh start

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_DIR="$(dirname "$SCRIPT_DIR")"
MODEL_CACHE="$PLUGIN_DIR/node_modules/@xenova/transformers/.cache"
SETTINGS_FILE="$HOME/.claude/settings.json"

echo ""
echo "=== Cortex Clean Install ==="
echo ""
echo "This will remove:"
echo ""

# Check what exists
HAS_DB=false
HAS_MODEL=false
HAS_SETTINGS=false

if [ -d "$HOME/.cortex" ]; then
    HAS_DB=true
    DB_SIZE=$(du -sh "$HOME/.cortex" 2>/dev/null | cut -f1)
    echo "  [1] Database & config:  ~/.cortex/ ($DB_SIZE)"
else
    echo "  [1] Database & config:  (not found)"
fi

if [ -d "$MODEL_CACHE" ]; then
    HAS_MODEL=true
    MODEL_SIZE=$(du -sh "$MODEL_CACHE" 2>/dev/null | cut -f1)
    echo "  [2] Embedding model:    $MODEL_CACHE ($MODEL_SIZE)"
else
    echo "  [2] Embedding model:    (not found)"
fi

if [ -f "$SETTINGS_FILE" ] && grep -q "cortex" "$SETTINGS_FILE" 2>/dev/null; then
    HAS_SETTINGS=true
    echo "  [3] Claude settings:    Plugin entries in ~/.claude/settings.json"
else
    echo "  [3] Claude settings:    (no cortex entries)"
fi

echo ""

if ! $HAS_DB && ! $HAS_MODEL && ! $HAS_SETTINGS; then
    echo "Nothing to clean. Already fresh!"
    exit 0
fi

read -p "Proceed with cleanup? [y/N] " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""

# 1. Remove database and config
echo "[1/3] Database & config"
if $HAS_DB; then
    rm -rf "$HOME/.cortex"
    echo "      Removed ~/.cortex/"
else
    echo "      Skipped (not found)"
fi

# 2. Remove cached embedding model
echo "[2/3] Embedding model cache"
if $HAS_MODEL; then
    rm -rf "$MODEL_CACHE"
    echo "      Removed model cache"
else
    echo "      Skipped (not found)"
fi

# 3. Remove plugin from Claude Code settings
echo "[3/3] Claude Code settings"
if $HAS_SETTINGS; then
    # Create backup
    cp "$SETTINGS_FILE" "$SETTINGS_FILE.bak"
    echo "      Backup: ~/.claude/settings.json.bak"

    # Use node to properly edit JSON
    node -e "
const fs = require('fs');
const settings = JSON.parse(fs.readFileSync('$SETTINGS_FILE', 'utf8'));

// Remove statusLine if it references cortex
if (settings.statusLine?.command?.includes('cortex')) {
    delete settings.statusLine;
}

// Remove from extraKnownMarketplaces
if (settings.extraKnownMarketplaces) {
    Object.keys(settings.extraKnownMarketplaces).forEach(key => {
        if (key.includes('cortex')) {
            delete settings.extraKnownMarketplaces[key];
        }
    });
    if (Object.keys(settings.extraKnownMarketplaces).length === 0) {
        delete settings.extraKnownMarketplaces;
    }
}

// Remove from enabledPlugins
if (settings.enabledPlugins) {
    Object.keys(settings.enabledPlugins).forEach(key => {
        if (key.includes('cortex')) {
            delete settings.enabledPlugins[key];
        }
    });
}

fs.writeFileSync('$SETTINGS_FILE', JSON.stringify(settings, null, 2) + '\n');
"
    echo "      Removed plugin entries"
else
    echo "      Skipped (no cortex entries)"
fi

echo ""
echo "=== Clean complete ==="
echo ""
echo "Ready for fresh install:"
echo "  cd $PLUGIN_DIR"
echo "  npm install && npm run build"
