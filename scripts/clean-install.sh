#!/bin/bash
# Cortex Clean Install Script
# Removes database, cached models, plugin cache, and plugin registration for a fresh start

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_DIR="$(dirname "$SCRIPT_DIR")"
MODEL_CACHE="$PLUGIN_DIR/node_modules/@xenova/transformers/.cache"
SETTINGS_FILE="$HOME/.claude/settings.json"
PLUGIN_CACHE="$HOME/.claude/plugins/cache/cortex"
MCP_LOGS_DIR="$HOME/Library/Caches/claude-cli-nodejs"
MCP_CONFIG_GLOBAL="$HOME/.claude/.mcp.json"
MCP_CONFIG_LOCAL="$PLUGIN_DIR/.mcp.json"

echo ""
echo "=== Cortex Clean Install ==="
echo ""
echo "This will remove:"
echo ""

# Check what exists
HAS_DB=false
HAS_MODEL=false
HAS_SETTINGS=false
HAS_PLUGIN_CACHE=false
HAS_MCP_LOGS=false
HAS_MCP_CONFIG=false

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

if [ -d "$PLUGIN_CACHE" ]; then
    HAS_PLUGIN_CACHE=true
    CACHE_SIZE=$(du -sh "$PLUGIN_CACHE" 2>/dev/null | cut -f1)
    echo "  [4] Plugin cache:       $PLUGIN_CACHE ($CACHE_SIZE)"
else
    echo "  [4] Plugin cache:       (not found)"
fi

# Check for MCP logs containing cortex
MCP_LOGS_COUNT=$(find "$MCP_LOGS_DIR" -type d -name "*cortex*" 2>/dev/null | wc -l | tr -d ' ')
if [ "$MCP_LOGS_COUNT" -gt 0 ]; then
    HAS_MCP_LOGS=true
    echo "  [5] MCP logs:           $MCP_LOGS_COUNT cortex log directories"
else
    echo "  [5] MCP logs:           (not found)"
fi

# Check for MCP server configs containing cortex
MCP_CONFIG_FOUND=""
if [ -f "$MCP_CONFIG_GLOBAL" ] && grep -q "cortex" "$MCP_CONFIG_GLOBAL" 2>/dev/null; then
    MCP_CONFIG_FOUND="global"
fi
if [ -f "$MCP_CONFIG_LOCAL" ] && grep -q "cortex" "$MCP_CONFIG_LOCAL" 2>/dev/null; then
    MCP_CONFIG_FOUND="${MCP_CONFIG_FOUND:+$MCP_CONFIG_FOUND, }local"
fi
if [ -n "$MCP_CONFIG_FOUND" ]; then
    HAS_MCP_CONFIG=true
    echo "  [6] MCP server config:  cortex entries in $MCP_CONFIG_FOUND .mcp.json"
else
    echo "  [6] MCP server config:  (no cortex entries)"
fi

echo ""

if ! $HAS_DB && ! $HAS_MODEL && ! $HAS_SETTINGS && ! $HAS_PLUGIN_CACHE && ! $HAS_MCP_LOGS && ! $HAS_MCP_CONFIG; then
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
echo "[1/6] Database & config"
if $HAS_DB; then
    rm -rf "$HOME/.cortex"
    echo "      Removed ~/.cortex/"
else
    echo "      Skipped (not found)"
fi

# 2. Remove cached embedding model
echo "[2/6] Embedding model cache"
if $HAS_MODEL; then
    rm -rf "$MODEL_CACHE"
    echo "      Removed model cache"
else
    echo "      Skipped (not found)"
fi

# 3. Remove plugin from Claude Code settings
echo "[3/6] Claude Code settings"
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

# 4. Remove plugin cache
echo "[4/6] Plugin cache"
if $HAS_PLUGIN_CACHE; then
    rm -rf "$PLUGIN_CACHE"
    echo "      Removed $PLUGIN_CACHE"
else
    echo "      Skipped (not found)"
fi

# 5. Remove MCP logs
echo "[5/6] MCP logs"
if $HAS_MCP_LOGS; then
    find "$MCP_LOGS_DIR" -type d -name "*cortex*" -exec rm -rf {} + 2>/dev/null || true
    echo "      Removed $MCP_LOGS_COUNT cortex log directories"
else
    echo "      Skipped (not found)"
fi

# 6. Remove cortex from MCP server configs
echo "[6/6] MCP server config"
if $HAS_MCP_CONFIG; then
    # Function to remove cortex from .mcp.json
    remove_cortex_mcp() {
        local file="$1"
        if [ -f "$file" ] && grep -q "cortex" "$file" 2>/dev/null; then
            cp "$file" "$file.bak"
            node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('$file', 'utf8'));

if (config.mcpServers) {
    Object.keys(config.mcpServers).forEach(key => {
        if (key.toLowerCase().includes('cortex')) {
            delete config.mcpServers[key];
        }
    });
}

fs.writeFileSync('$file', JSON.stringify(config, null, 2) + '\n');
" 2>/dev/null && echo "      Cleaned $(basename "$file")" || echo "      Failed to clean $(basename "$file")"
        fi
    }
    
    remove_cortex_mcp "$MCP_CONFIG_GLOBAL"

else
    echo "      Skipped (no cortex entries)"
fi

echo ""
echo "=== Clean complete ==="
echo ""
echo "Ready for fresh install:"
echo "  1. Restart Claude Code"
echo "  2. Run /plugin and install marketplace hjertefolger/cortex"
echo "  3. Run /plugin install cortex"
echo "  4. Run /cortex-setup to initialize"
echo ""
