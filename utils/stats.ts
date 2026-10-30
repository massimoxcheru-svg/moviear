/**
 * Numbers for the Profile screen, computed from what is stored on the
 * device. All pure.
 */

export interface GenreShare {
  genre: Genre;
  count: number;
  /** 0 to 1 share of all genre tags, not of movies. */
  share: number;
}

/**
 * How often each genre appears across the given movies, most common first.
 * Unknown genre ids (not in `genres`) are ignored.
 */
export function genreBreakdown(
  movies: readonly { genre_ids: readonly number[] }[],
  genres: readonly Genre[],
  max = 5,
): GenreShare[] {
  const names = new Map(genres.map((g) => [g.id, g]));
  const counts = new Map<number, number>();
  let total = 0;
  for (const movie of movies) {
    for (const id of movie.genre_ids) {
      if (!names.has(id)) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
      total += 1;
    }
  }
  if (total === 0) return [];
  return [...counts.entries()]
    .map(([id, count]) => ({ genre: names.get(id) as Genre, count, share: count / total }))
    .sort((a, b) => b.count - a.count || a.genre.name.localeCompare(b.genre.name))
    .slice(0, max);
}

export interface RatingSummary {
  rated: number;
  /** Mean of the user's own ratings, null when none. */
  average: number | null;
  /** How many ratings per score, index 1 to 10 (index 0 unused). */
  histogram: number[];
}

export function ratingSummary(movies: readonly { rating: number | null }[]): RatingSummary {
  const histogram = new Array<number>(11).fill(0);
  let sum = 0;
  let rated = 0;
  for (const m of movies) {
    if (m.rating === null) continue;
    histogram[m.rating] += 1;
    sum += m.rating;
    rated += 1;
  }
  return { rated, average: rated ? sum / rated : null, histogram };
}

/** Release decades represented in a list, most common first ("1990s"). */
export function decadeBreakdown(
  movies: readonly { release_date: string }[],
  max = 4,
): { decade: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const m of movies) {
    const year = /^(\d{4})/.exec(m.release_date)?.[1];
    if (!year) continue;
    const decade = `${year.slice(0, 3)}0s`;
    counts.set(decade, (counts.get(decade) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([decade, count]) => ({ decade, count }))
    .sort((a, b) => b.count - a.count || b.decade.localeCompare(a.decade))
    .slice(0, max);
}
