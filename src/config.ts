/**
 * Cortex Configuration Module
 * Handles loading, saving, and validating configuration
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { Config, StatuslineConfig, ArchiveConfig, MonitorConfig } from './types.js';

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_STATUSLINE_CONFIG: StatuslineConfig = {
  enabled: true,
  showFragments: true,
  showLastArchive: true,
  showContext: true,
  contextWarningThreshold: 70,
};

export const DEFAULT_ARCHIVE_CONFIG: ArchiveConfig = {
  autoOnCompact: true,
  projectScope: true,
  minContentLength: 50,
};

export const DEFAULT_MONITOR_CONFIG: MonitorConfig = {
  tokenThreshold: 70,
};

export const DEFAULT_CONFIG: Config = {
  statusline: DEFAULT_STATUSLINE_CONFIG,
  archive: DEFAULT_ARCHIVE_CONFIG,
  monitor: DEFAULT_MONITOR_CONFIG,
};

// ============================================================================
// Paths
// ============================================================================

/**
 * Get the Cortex data directory path
 */
export function getDataDir(): string {
  const home = os.homedir();
  return path.join(home, '.cortex');
}

/**
 * Get the configuration file path
 */
export function getConfigPath(): string {
  return path.join(getDataDir(), 'config.json');
}

/**
 * Get the database file path
 */
export function getDatabasePath(): string {
  return path.join(getDataDir(), 'memory.db');
}

/**
 * Ensure the data directory exists
 */
export function ensureDataDir(): void {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ============================================================================
// Configuration Loading/Saving
// ============================================================================

/**
 * Deep merge two objects
 */
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue !== undefined &&
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null
    ) {
      result[key] = deepMerge(targetValue as object, sourceValue as object) as T[keyof T];
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Load configuration from disk, merging with defaults
 */
export function loadConfig(): Config {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf8');
    const loaded = JSON.parse(content);
    return deepMerge(DEFAULT_CONFIG, loaded);
  } catch {
    // Return defaults if loading fails
    return DEFAULT_CONFIG;
  }
}

/**
 * Save configuration to disk
 */
export function saveConfig(config: Config): void {
  ensureDataDir();
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

/**
 * Update a specific section of the configuration
 */
export function updateConfig(updates: Partial<Config>): Config {
  const current = loadConfig();
  const updated = deepMerge(current, updates);
  saveConfig(updated);
  return updated;
}

// ============================================================================
// Configuration Presets
// ============================================================================

export type ConfigPreset = 'full' | 'essential' | 'minimal';

export const CONFIG_PRESETS: Record<ConfigPreset, Partial<Config>> = {
  full: {
    statusline: {
      enabled: true,
      showFragments: true,
      showLastArchive: true,
      showContext: true,
      contextWarningThreshold: 70,
    },
    archive: {
      autoOnCompact: true,
      projectScope: true,
      minContentLength: 50,
    },
    monitor: {
      tokenThreshold: 70,
    },
  },
  essential: {
    statusline: {
      enabled: true,
      showFragments: true,
      showLastArchive: false,
      showContext: true,
      contextWarningThreshold: 80,
    },
    archive: {
      autoOnCompact: true,
      projectScope: true,
      minContentLength: 100,
    },
    monitor: {
      tokenThreshold: 80,
    },
  },
  minimal: {
    statusline: {
      enabled: false,
      showFragments: false,
      showLastArchive: false,
      showContext: false,
      contextWarningThreshold: 90,
    },
    archive: {
      autoOnCompact: false,
      projectScope: true,
      minContentLength: 50,
    },
    monitor: {
      tokenThreshold: 90,
    },
  },
};

/**
 * Apply a configuration preset
 */
export function applyPreset(preset: ConfigPreset): Config {
  const presetConfig = CONFIG_PRESETS[preset];
  const config = deepMerge(DEFAULT_CONFIG, presetConfig);
  saveConfig(config);
  return config;
}
