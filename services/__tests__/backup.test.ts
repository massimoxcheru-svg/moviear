jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  backupFileName,
  BackupError,
  buildBackup,
  parseBackup,
  restoreBackup,
  serialiseBackup,
  summariseBackup,
} from "../backup";
import * as saved from "../savedMovies";
import * as history from "../history";
import * as settings from "../settings";

const movie = (id: number): MovieCardMovie => ({
  id,
  title: `Movie ${id}`,
  poster_path: null,
  vote_average: 5,
  release_date: "2020-01-01",
});

beforeEach(async () => {
  await saved.hydrateSavedMovies();
  await history.hydrateHistory();
  await settings.hydrateSettings();
  saved.clearSavedMovies();
  history.clearHistory();
  settings.resetSettings();
});

describe("building", () => {
  it("captures the three stores with a format marker", () => {
    saved.saveMovie(movie(1));
    saved.rateSavedMovie(1, 8);
    history.recordView(movie(2), 123);
    settings.updateSettings({ region: "GB" });

    const doc = buildBackup(new Date("2024-06-15T10:00:00Z"));
    expect(doc.format).toBe(BACKUP_FORMAT);
    expect(doc.version).toBe(BACKUP_VERSION);
    expect(doc.exportedAt).toBe("2024-06-15T10:00:00.000Z");
    expect(doc.saved).toHaveLength(1);
    expect(doc.saved[0].rating).toBe(8);
    expect(doc.history[0]).toMatchObject({ id: 2, viewed_at: 123 });
    expect(doc.settings.region).toBe("GB");
    expect(summariseBackup(doc)).toEqual({
      saved: 1,
      history: 1,
      exportedAt: "2024-06-15T10:00:00.000Z",
    });
  });

  it("round trips through text", () => {
    saved.saveMovie(movie(1));
    const doc = buildBackup();
    expect(parseBackup(serialiseBackup(doc))).toEqual(doc);
  });

  it("names the file by date", () => {
    expect(backupFileName(new Date(2024, 0, 5))).toBe("moviear-backup-2024-01-05.json");
  });
});

describe("parsing", () => {
  it("rejects text that is not JSON", () => {
    expect(() => parseBackup("{nope")).toThrow(BackupError);
    expect(() => parseBackup("{nope")).toThrow(/not valid JSON/);
  });

  it("rejects JSON that is not a backup", () => {
    expect(() => parseBackup(JSON.stringify({ saved: [] }))).toThrow(/not a MovieAr backup/);
    expect(() => parseBackup("[]")).toThrow(/not a MovieAr backup/);
  });

  it("rejects a newer version", () => {
    const text = JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION + 1 });
    expect(() => parseBackup(text)).toThrow(/newer version/);
  });

  it("keeps only entries with an id and a title, and sanitises settings", () => {
    const doc = parseBackup(
      JSON.stringify({
        format: BACKUP_FORMAT,
        version: 1,
        saved: [{ id: 1, title: "ok" }, { id: 2 }, "x"],
        history: [{ id: 3, title: "h" }],
        settings: { region: "JP", language: "nope" },
      }),
    );
    expect(doc.saved.map((m) => m.id)).toEqual([1]);
    expect(doc.history.map((m) => m.id)).toEqual([3]);
    expect(doc.settings).toEqual({ ...settings.DEFAULT_SETTINGS, region: "JP" });
    expect(doc.exportedAt).toBe("");
  });
});

describe("restoring", () => {
  const doc = () =>
    parseBackup(
      JSON.stringify({
        format: BACKUP_FORMAT,
        version: 1,
        saved: [{ id: 10, title: "Ten", saved_at: 5, rating: 7 }],
        history: [{ id: 20, title: "Twenty", viewed_at: 9 }],
        settings: { trendingWindow: "week" },
      }),
    );

  it("merges into the stores and can apply settings", () => {
    saved.saveMovie(movie(1));
    history.recordView(movie(2));

    const result = restoreBackup(doc(), { mode: "merge", includeSettings: true });
    expect(result).toEqual({ saved: 2, history: 2 });
    expect(saved.getSavedMovie(10)?.rating).toBe(7);
    expect(saved.isMovieSaved(1)).toBe(true);
    expect(settings.getSettings().trendingWindow).toBe("week");
  });

  it("replaces and leaves settings alone when asked", () => {
    saved.saveMovie(movie(1));
    settings.updateSettings({ region: "DE" });

    const result = restoreBackup(doc(), { mode: "replace", includeSettings: false });
    expect(result).toEqual({ saved: 1, history: 1 });
    expect(saved.isMovieSaved(1)).toBe(false);
    expect(settings.getSettings()).toMatchObject({ region: "DE", trendingWindow: "day" });
  });
});
