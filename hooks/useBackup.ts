import { useCallback, useState } from "react";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import {
  backupFileName,
  BackupError,
  buildBackup,
  parseBackup,
  restoreBackup,
  serialiseBackup,
  summariseBackup,
  type BackupDocument,
  type BackupSummary,
  type RestoreOptions,
} from "@/services/backup";

export interface PendingImport {
  doc: BackupDocument;
  summary: BackupSummary;
}

/**
 * The native side of backups: write the JSON to the cache folder and hand
 * it to the share sheet, or pick a file and parse it. Restoring is a
 * separate step so the screen can ask merge or replace first.
 */
export function useBackup() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportBackup = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const dir = FileSystem.cacheDirectory;
      if (!dir) throw new Error("No writable folder is available on this device.");
      const uri = `${dir}${backupFileName()}`;
      await FileSystem.writeAsStringAsync(uri, serialiseBackup(buildBackup()));
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error("Sharing is not available on this device.");
      }
      await Sharing.shareAsync(uri, {
        mimeType: "application/json",
        dialogTitle: "Save your MovieAr backup",
        UTI: "public.json",
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  /** Returns the parsed backup, or null when the user cancelled or the file was bad. */
  const pickBackup = useCallback(async (): Promise<PendingImport | null> => {
    setBusy(true);
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/plain", "*/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || result.assets.length === 0) return null;
      const text = await FileSystem.readAsStringAsync(result.assets[0].uri);
      const doc = parseBackup(text);
      return { doc, summary: summariseBackup(doc) };
    } catch (err) {
      const message =
        err instanceof BackupError
          ? err.message
          : "Could not read that file. Pick a backup exported from MovieAr.";
      setError(message);
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const restore = useCallback((doc: BackupDocument, options: RestoreOptions) => {
    return restoreBackup(doc, options);
  }, []);

  return { busy, error, exportBackup, pickBackup, restore, clearError: () => setError(null) };
}

export default useBackup;
