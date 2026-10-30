import { useCallback, useSyncExternalStore } from "react";
import {
  getSnapshot,
  resetSettings,
  subscribe,
  updateSettings,
  type Settings,
} from "@/services/settings";

/** Subscribe to user settings. Re-renders whenever any setting changes. */
export function useSettings() {
  const { settings, hydrated } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );

  const update = useCallback((patch: Partial<Settings>) => updateSettings(patch), []);
  const reset = useCallback(() => resetSettings(), []);

  return { settings, hydrated, update, reset };
}

export default useSettings;
