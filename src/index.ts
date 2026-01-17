/**
 * Cortex v2.0 - Main Entry Point
 * Handles statusline display, CLI commands, and hook events
 */

import { readStdin, getProjectId, getContextPercent, formatDuration } from './stdin.js';
import { loadConfig, ensureDataDir, applyPreset, getDataDir, type ConfigPreset } from './config.js';
import { initDb, getStats, getProjectStats, formatBytes, closeDb, saveDb } from './database.js';
import { verifyModel, getModelName } from './embeddings.js';
import { hybridSearch, formatSearchResults } from './search.js';
import { archiveSession, formatArchiveResult } from './archive.js';
import type { StdinData, CommandName } from './types.js';

// ============================================================================
// Command Router
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] as CommandName | undefined;

  try {
    switch (command) {
      case 'statusline':
        await handleStatusline();
        break;

      case 'session-start':
        await handleSessionStart();
        break;

      case 'monitor':
        await handleMonitor();
        break;

      case 'pre-compact':
        await handlePreCompact();
        break;

      case 'save':
      case 'archive':
        await handleSave(args.slice(1));
        break;

      case 'recall':
      case 'search':
        await handleRecall(args.slice(1));
        break;

      case 'stats':
        await handleStats();
        break;

      case 'setup':
        await handleSetup();
        break;

      case 'configure':
        await handleConfigure(args.slice(1));
        break;

      case 'test-embed':
        await handleTestEmbed(args[1] || 'hello world');
        break;

      default:
        // Default: show statusline if no command
        await handleStatusline();
        break;
    }
  } catch (error) {
    console.error(`[Cortex Error] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  } finally {
    closeDb();
  }
}

// ============================================================================
// Statusline Handler
// ============================================================================

async function handleStatusline() {
  const stdin = await readStdin();
  const config = loadConfig();

  if (!config.statusline.enabled) {
    return;
  }

  // Initialize database (may create if doesn't exist)
  const db = await initDb();
  const stats = getStats(db);

  const parts: string[] = ['[Cortex]'];

  // Fragment count
  if (config.statusline.showFragments) {
    parts.push(`${stats.fragmentCount} frags`);
  }

  // Project info
  if (stdin?.cwd) {
    const projectId = getProjectId(stdin.cwd);
    const projectStats = getProjectStats(db, projectId);

    parts.push(projectId);

    // Last archive time
    if (config.statusline.showLastArchive && projectStats.lastArchive) {
      parts.push(`Last: ${formatDuration(projectStats.lastArchive)}`);
    }

    // Context usage warning
    if (config.statusline.showContext) {
      const contextPercent = getContextPercent(stdin);
      if (contextPercent >= config.statusline.contextWarningThreshold) {
        parts.push(`⚠ ${contextPercent}%`);
      }
    }
  }

  console.log(parts.join(' | '));
}

// ============================================================================
// Hook Handlers
// ============================================================================

async function handleSessionStart() {
  const stdin = await readStdin();

  // Initialize database
  await initDb();

  if (stdin?.cwd) {
    const projectId = getProjectId(stdin.cwd);
    const db = await initDb();
    const projectStats = getProjectStats(db, projectId);

    if (projectStats.fragmentCount > 0) {
      console.log(`[Cortex] Loaded ${projectStats.fragmentCount} memories for ${projectId}`);
    } else {
      console.log(`[Cortex] Ready for ${projectId} (no memories yet)`);
    }
  } else {
    console.log('[Cortex] Session started');
  }
}

async function handleMonitor() {
  const stdin = await readStdin();
  const config = loadConfig();

  if (!stdin) return;

  // Check if context usage is above threshold
  const contextPercent = getContextPercent(stdin);
  if (contextPercent >= config.monitor.tokenThreshold) {
    console.log(`[Cortex] Context at ${contextPercent}% - consider archiving with /save`);
  }
}

async function handlePreCompact() {
  const stdin = await readStdin();
  const config = loadConfig();

  if (!config.archive.autoOnCompact) {
    return;
  }

  if (!stdin?.transcript_path) {
    console.log('[Cortex] No transcript available for archiving');
    return;
  }

  const db = await initDb();
  const projectId = config.archive.projectScope && stdin.cwd
    ? getProjectId(stdin.cwd)
    : null;

  console.log('[Cortex] Auto-archiving before compact...');

  const result = await archiveSession(db, stdin.transcript_path, projectId, {
    onProgress: (current, total) => {
      process.stdout.write(`\r[Cortex] Embedding ${current}/${total}...`);
    },
  });

  console.log('');
  console.log(`[Cortex] Archived ${result.archived} fragments (${result.duplicates} duplicates skipped)`);
}

// ============================================================================
// Command Handlers
// ============================================================================

async function handleSave(args: string[]) {
  const stdin = await readStdin();
  const config = loadConfig();

  // Parse arguments
  let transcriptPath = '';
  let forceGlobal = false;

  for (const arg of args) {
    if (arg === '--all' || arg === '--global') {
      forceGlobal = true;
    } else if (arg.startsWith('--transcript=')) {
      transcriptPath = arg.slice('--transcript='.length);
    } else if (!arg.startsWith('--')) {
      transcriptPath = arg;
    }
  }

  // Get transcript path from stdin if not provided
  if (!transcriptPath && stdin?.transcript_path) {
    transcriptPath = stdin.transcript_path;
  }

  if (!transcriptPath) {
    console.log('Usage: cortex save [--transcript=PATH] [--global]');
    console.log('       Or pipe stdin data from Claude Code');
    return;
  }

  const db = await initDb();
  const projectId = forceGlobal
    ? null
    : config.archive.projectScope && stdin?.cwd
      ? getProjectId(stdin.cwd)
      : null;

  console.log(`[Cortex] Archiving session${projectId ? ` to ${projectId}` : ' (global)'}...`);

  const result = await archiveSession(db, transcriptPath, projectId, {
    onProgress: (current, total) => {
      process.stdout.write(`\r[Cortex] Processing ${current}/${total}...`);
    },
  });

  console.log('');
  console.log(formatArchiveResult(result));
}

async function handleRecall(args: string[]) {
  const stdin = await readStdin();

  // Parse arguments
  let query = '';
  let includeAll = false;

  for (const arg of args) {
    if (arg === '--all' || arg === '--global') {
      includeAll = true;
    } else if (!arg.startsWith('--')) {
      query += (query ? ' ' : '') + arg;
    }
  }

  if (!query) {
    console.log('Usage: cortex recall <query> [--all]');
    console.log('       --all: Search across all projects');
    return;
  }

  const db = await initDb();
  const projectId = stdin?.cwd ? getProjectId(stdin.cwd) : null;

  console.log(`[Cortex] Searching${includeAll ? ' all projects' : projectId ? ` in ${projectId}` : ''}...`);

  const results = await hybridSearch(db, query, {
    projectScope: !includeAll,
    projectId: projectId || undefined,
    includeAllProjects: includeAll,
    limit: 5,
  });

  console.log(formatSearchResults(results));
}

async function handleStats() {
  const stdin = await readStdin();
  const db = await initDb();
  const stats = getStats(db);

  const lines: string[] = [];
  lines.push('');
  lines.push('Cortex Memory Stats');
  lines.push('------------------------');
  lines.push(`  Fragments: ${stats.fragmentCount}`);
  lines.push(`  Projects:  ${stats.projectCount}`);
  lines.push(`  Sessions:  ${stats.sessionCount}`);
  lines.push(`  DB Size:   ${formatBytes(stats.dbSizeBytes)}`);
  lines.push(`  Model:     ${getModelName()}`);

  if (stats.oldestTimestamp) {
    lines.push(`  Oldest:    ${stats.oldestTimestamp.toLocaleDateString()}`);
  }

  if (stats.newestTimestamp) {
    lines.push(`  Newest:    ${stats.newestTimestamp.toLocaleDateString()}`);
  }

  // Project-specific stats if we have stdin
  if (stdin?.cwd) {
    const projectId = getProjectId(stdin.cwd);
    const projectStats = getProjectStats(db, projectId);

    lines.push('');
    lines.push(`Project: ${projectId}`);
    lines.push(`  Fragments: ${projectStats.fragmentCount}`);
    lines.push(`  Sessions:  ${projectStats.sessionCount}`);

    if (projectStats.lastArchive) {
      lines.push(`  Last Save: ${formatDuration(projectStats.lastArchive)}`);
    }
  }

  console.log(lines.join('\n'));
}

async function handleSetup() {
  console.log('[Cortex] Setting up Cortex...');

  // Ensure data directory exists
  ensureDataDir();
  console.log(`  ✓ Data directory: ${getDataDir()}`);

  // Initialize database
  const db = await initDb();
  saveDb(db);
  console.log('  ✓ Database initialized');

  // Verify embedding model
  console.log('  ⏳ Loading embedding model (first run may take a minute)...');
  const modelStatus = await verifyModel();

  if (modelStatus.success) {
    console.log(`  ✓ Model loaded: ${modelStatus.model} (${modelStatus.dimensions}d)`);
  } else {
    console.log(`  ✗ Model failed: ${modelStatus.error}`);
    return;
  }

  console.log('');
  console.log('[Cortex] Setup complete!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Install the plugin in Claude Code settings');
  console.log('  2. Use /save to archive session context');
  console.log('  3. Use /recall <query> to search memories');
}

async function handleConfigure(args: string[]) {
  const preset = args[0] as ConfigPreset | undefined;

  if (preset && ['full', 'essential', 'minimal'].includes(preset)) {
    const config = applyPreset(preset);
    console.log(`[Cortex] Applied "${preset}" preset`);
    console.log('');
    console.log('Configuration:');
    console.log(`  Statusline: ${config.statusline.enabled ? 'enabled' : 'disabled'}`);
    console.log(`  Auto-archive: ${config.archive.autoOnCompact ? 'enabled' : 'disabled'}`);
    console.log(`  Context warning: ${config.statusline.contextWarningThreshold}%`);
    return;
  }

  console.log('Usage: cortex configure <preset>');
  console.log('');
  console.log('Presets:');
  console.log('  full      - All features enabled (statusline, auto-archive, warnings)');
  console.log('  essential - Statusline + auto-archive only');
  console.log('  minimal   - Commands only (no hooks/statusline)');
}

async function handleTestEmbed(text: string) {
  console.log(`[Cortex] Testing embedding for: "${text}"`);

  const result = await verifyModel();

  if (result.success) {
    console.log(`  Model: ${result.model}`);
    console.log(`  Dimensions: ${result.dimensions}`);
    console.log('  ✓ Embedding generation working');
  } else {
    console.log(`  ✗ Error: ${result.error}`);
  }
}

// ============================================================================
// Exports for testing
// ============================================================================

export {
  handleStatusline,
  handleSessionStart,
  handleMonitor,
  handlePreCompact,
  handleSave,
  handleRecall,
  handleStats,
  handleSetup,
  handleConfigure,
};

// Run main
main();
