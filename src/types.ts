/**
 * Cortex TypeScript Types
 */

// ============================================================================
// Stdin Data (from Claude Code)
// Matches Claude Code's actual JSON structure
// ============================================================================

export interface StdinData {
  transcript_path?: string;
  cwd?: string;
  model?: {
    id?: string;
    display_name?: string;
  };
  context_window?: {
    context_window_size?: number;
    current_usage?: {
      input_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    } | null;
    // Native percentage fields (Claude Code v2.1.6+)
    used_percentage?: number | null;
    remaining_percentage?: number | null;
  };
}

// ============================================================================
// Database Types
// ============================================================================

export interface Memory {
  id: number;
  content: string;
  contentHash: string;
  embedding: Float32Array;
  projectId: string | null;
  sourceSession: string;
  timestamp: Date;
}

export interface DbStats {
  fragmentCount: number;
  projectCount: number;
  sessionCount: number;
  dbSizeBytes: number;
  oldestTimestamp: Date | null;
  newestTimestamp: Date | null;
}

export interface ProjectStats {
  fragmentCount: number;
  sessionCount: number;
  lastArchive: Date | null;
}

// ============================================================================
// Search Types
// ============================================================================

export interface SearchResult {
  id: number;
  score: number;
  content: string;
  source: 'vector' | 'keyword' | 'hybrid';
  timestamp: Date;
  projectId: string | null;
}

export interface SearchOptions {
  projectScope?: boolean;
  projectId?: string;
  limit?: number;
  includeAllProjects?: boolean;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface StatuslineConfig {
  enabled: boolean;
  showFragments: boolean;
  showLastArchive: boolean;
  showContext: boolean;
  contextWarningThreshold: number;
}

export interface ArchiveConfig {
  autoOnCompact: boolean;
  projectScope: boolean;
  minContentLength: number;
}

export interface MonitorConfig {
  tokenThreshold: number;
}

export interface Config {
  statusline: StatuslineConfig;
  archive: ArchiveConfig;
  monitor: MonitorConfig;
}

// ============================================================================
// Archive Types
// ============================================================================

export interface ArchiveResult {
  archived: number;
  skipped: number;
  duplicates: number;
}

export interface ArchiveOptions {
  onProgress?: (current: number, total: number) => void;
}

export interface TranscriptMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

// ============================================================================
// CLI Command Types
// ============================================================================

export type CommandName =
  | 'statusline'
  | 'session-start'
  | 'monitor'
  | 'pre-compact'
  | 'save'
  | 'archive'
  | 'recall'
  | 'search'
  | 'stats'
  | 'configure'
  | 'setup'
  | 'test-embed';

export interface CommandContext {
  stdin: StdinData | null;
  args: string[];
  projectId: string | null;
}
