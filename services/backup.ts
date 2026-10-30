/**
 * Export and import of everything the app stores on the device: the
 * watchlist, the viewing history and the settings. The file format is plain
 * JSON so it can be inspected or edited by hand.
 *
 * Only the pure parts live here (building and validating the document). The
 * file system and share sheet calls are in hooks/useBackup.ts so this module
 * can be unit tested without native modules.
 */

import { getSavedMovies, importSavedMovies } from "./savedMovies";
import { getHistory, importHistory } from "./history";
import { getSettings, sanitizeSettings, updateSettings, type Settings } from "./settings";

export const BACKUP_FORMAT = "moviear-backup";
export const BACKUP_VERSION = 1;

export interface BackupDocument {
  format: typeof BACKUP_FORMAT;
  version: number;
  /** ISO timestamp of the export. */
  exportedAt: string;
  saved: SavedMovie[];
  history: HistoryEntry[];
  settings: Settings;
}

export interface BackupSummary {
  saved: number;
  history: number;
  exportedAt: string;
}

export function buildBackup(now: Date = new Date()): BackupDocument {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    saved: [...getSavedMovies()],
    history: [...getHistory()],
    settings: getSettings(),
  };
}

export function serialiseBackup(doc: BackupDocument): string {
  return JSON.stringify(doc, null, 2);
}

/** File name like moviear-backup-2024-06-15.json. */
export function backupFileName(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `moviear-backup-${y}-${m}-${d}.json`;
}

export class BackupError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasIdAndTitle(value: unknown): value is { id: number; title: string } {
  return isRecord(value) && typeof value.id === "number" && typeof value.title === "string";
}

/**
 * Parse and validate a backup. Throws BackupError with a message fit for an
 * alert when the text is not a MovieAr backup. Entries missing optional
 * fields are accepted; the stores fill in defaults on import.
 */
export function parseBackup(text: string): BackupDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupError("That file is not valid JSON.");
  }
  if (!isRecord(parsed) || parsed.format !== BACKUP_FORMAT) {
    throw new BackupError("That file is not a MovieAr backup.");
  }
  if (typeof parsed.version !== "number" || parsed.version > BACKUP_VERSION) {
    throw new BackupError("That backup was made by a newer version of the app.");
  }
  const saved = Array.isArray(parsed.saved) ? parsed.saved.filter(hasIdAndTitle) : [];
  const history = Array.isArray(parsed.history) ? parsed.history.filter(hasIdAndTitle) : [];
  return {
    format: BACKUP_FORMAT,
    version: parsed.version,
    exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : "",
    saved: saved as SavedMovie[],
    history: history as HistoryEntry[],
    settings: sanitizeSettings(parsed.settings),
  };
}

export function summariseBackup(doc: BackupDocument): BackupSummary {
  return { saved: doc.saved.length, history: doc.history.length, exportedAt: doc.exportedAt };
}

export interface RestoreOptions {
  /** Merge keeps what is on the device and adds the backup; replace drops it. */
  mode: "merge" | "replace";
  /** Also apply the settings in the backup. */
  includeSettings: boolean;
}

/** Apply a parsed backup to the stores. Returns the resulting counts. */
export function restoreBackup(
  doc: BackupDocument,
  { mode, includeSettings }: RestoreOptions,
): { saved: number; history: number } {
  const saved = importSavedMovies(doc.saved, mode);
  const history = importHistory(doc.history, mode);
  if (includeSettings) updateSettings(doc.settings);
  return { saved, history };
}
