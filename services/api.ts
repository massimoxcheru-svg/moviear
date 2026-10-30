/**
 * TMDB API client.
 *
 * The key is read from EXPO_PUBLIC_TMDB_API_KEY (see .env.example). Both key
 * types TMDB hands out are accepted:
 *   - a v3 "API Key" is sent as the `api_key` query parameter
 *   - a v4 "API Read Access Token" (a JWT starting with "eyJ") is sent as a
 *     Bearer header
 *
 * Every request carries the user's language, and the region sensitive lists
 * carry the region, both read from the settings store. Reads that change
 * slowly (trending, genres, details, people) go through the response cache.
 */

import { cachedFetch, DAY, HOUR, MINUTE } from "./cache";
import { getSettings } from "./settings";

export const TMDB_CONFIG = {
  BASE_URL: "https://api.themoviedb.org/3",
  IMAGE_BASE_URL: "https://image.tmdb.org/t/p",
} as const;

/** Read lazily (not at module load) so the key can be changed in tests. */
function getApiKey(): string {
  return process.env.EXPO_PUBLIC_TMDB_API_KEY ?? "";
}

export type PosterSize = "w185" | "w342" | "w500" | "w780" | "original";
export type ProfileSize = "w185" | "h632" | "original";

/** Full image URL for a TMDB `poster_path` / `backdrop_path`, or null. */
export function getImageUrl(
  path: string | null | undefined,
  size: PosterSize | ProfileSize = "w500",
): string | null {
  if (!path) return null;
  return `${TMDB_CONFIG.IMAGE_BASE_URL}/${size}${path}`;
}

/** Watch page for a YouTube video key, as TMDB hands them out. */
export function getYouTubeUrl(key: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(key)}`;
}

/** Thumbnail for a YouTube video key. */
export function getYouTubeThumbnail(key: string): string {
  return `https://img.youtube.com/vi/${encodeURIComponent(key)}/hqdefault.jpg`;
}

function isV4Token(key: string) {
  return key.startsWith("eyJ");
}

type QueryParams = Record<string, string | number | boolean | undefined>;

async function tmdbFetch<T>(
  path: string,
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "Missing TMDB API key. Add EXPO_PUBLIC_TMDB_API_KEY to your .env file and restart the dev server.",
    );
  }

  const url = new URL(`${TMDB_CONFIG.BASE_URL}${path}`);
  const headers: Record<string, string> = { accept: "application/json" };

  if (isV4Token(apiKey)) {
    headers.Authorization = `Bearer ${apiKey}`;
  } else {
    url.searchParams.set("api_key", apiKey);
  }

  const merged: QueryParams = { language: getSettings().language, ...params };
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const response = await fetch(url.toString(), { headers, signal });

  if (!response.ok) {
    // TMDB error bodies look like { status_code, status_message, success }
    let message = `TMDB request failed (${response.status})`;
    try {
      const body = (await response.json()) as { status_message?: string };
      if (body.status_message) message = body.status_message;
    } catch {
      // non-JSON body; keep the generic message
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

/** Cache key that changes with the language, so switching language refetches. */
function cacheKey(parts: (string | number)[]) {
  return [getSettings().language, ...parts].join(":");
}

export type TrendingTimeWindow = "day" | "week";

/** Movies trending on TMDB today (or this week). Cached for 30 minutes. */
export async function fetchTrendingMovies(
  timeWindow: TrendingTimeWindow = "day",
  signal?: AbortSignal,
): Promise<Movie[]> {
  const { data } = await cachedFetch(
    cacheKey(["trending", timeWindow]),
    30 * MINUTE,
    async () => {
      const page = await tmdbFetch<TMDBPaginatedResponse<Movie>>(
        `/trending/movie/${timeWindow}`,
        {},
        signal,
      );
      return page.results;
    },
  );
  return data;
}

/** An empty page, returned when a request is skipped (e.g. blank search). */
const EMPTY_PAGE: TMDBPaginatedResponse<Movie> = {
  page: 1,
  results: [],
  total_pages: 0,
  total_results: 0,
};

export type MovieListKind = "now_playing" | "popular" | "top_rated" | "upcoming";

/** The lists that depend on where the user is. */
const REGIONAL_LISTS: readonly MovieListKind[] = ["now_playing", "upcoming"];

/**
 * One page of a standard TMDB movie list (20 per page; `total_pages` tells
 * the caller when to stop). Page 1 is cached for 15 minutes so Home has
 * something to show when the network is slow or gone.
 */
export function fetchMovieList(
  kind: MovieListKind,
  page = 1,
  signal?: AbortSignal,
): Promise<TMDBPaginatedResponse<Movie>> {
  const { region } = getSettings();
  const params: QueryParams = { page };
  if (REGIONAL_LISTS.includes(kind)) params.region = region;

  const request = () =>
    tmdbFetch<TMDBPaginatedResponse<Movie>>(`/movie/${kind}`, params, signal);

  if (page !== 1) return request();
  return cachedFetch(
    cacheKey(["list", kind, region, page]),
    15 * MINUTE,
    request,
  ).then((r) => r.data);
}

/**
 * Latest releases. Uses /movie/now_playing because TMDB's /movie/latest
 * returns a single, usually obscure, record.
 */
export function fetchLatestMovies(
  page = 1,
  signal?: AbortSignal,
): Promise<TMDBPaginatedResponse<Movie>> {
  return fetchMovieList("now_playing", page, signal);
}

/**
 * Search movies by title, one page at a time. A blank query resolves to an
 * empty page without hitting the network.
 */
export async function searchMovies(
  query: string,
  page = 1,
  signal?: AbortSignal,
): Promise<TMDBPaginatedResponse<Movie>> {
  const trimmed = query.trim();
  if (!trimmed) return EMPTY_PAGE;

  return tmdbFetch<TMDBPaginatedResponse<Movie>>(
    "/search/movie",
    { query: trimmed, page, include_adult: false },
    signal,
  );
}

/**
 * Full details for a single movie, with the cast and the videos appended so
 * the details screen needs one request. Cached for 12 hours.
 */
export async function fetchMovieDetails(
  id: number | string,
  signal?: AbortSignal,
): Promise<MovieDetails> {
  const { data } = await cachedFetch(
    cacheKey(["movie", id]),
    12 * HOUR,
    () =>
      tmdbFetch<MovieDetails>(
        `/movie/${id}`,
        { append_to_response: "credits,videos" },
        signal,
      ),
  );
  return data;
}

/** Movies TMDB recommends alongside `id`, one page at a time. */
export function fetchRecommendedMovies(
  id: number | string,
  page = 1,
  signal?: AbortSignal,
): Promise<TMDBPaginatedResponse<Movie>> {
  return tmdbFetch<TMDBPaginatedResponse<Movie>>(
    `/movie/${id}/recommendations`,
    { page },
    signal,
  );
}

/** The official movie genre list. Cached for a week. */
export async function fetchGenres(signal?: AbortSignal): Promise<Genre[]> {
  const { data } = await cachedFetch(cacheKey(["genres"]), 7 * DAY, async () => {
    const body = await tmdbFetch<{ genres: Genre[] }>("/genre/movie/list", {}, signal);
    return body.genres;
  });
  return data;
}

export type DiscoverSort = "popularity" | "rating" | "newest";

const DISCOVER_SORT_PARAM: Record<DiscoverSort, string> = {
  popularity: "popularity.desc",
  rating: "vote_average.desc",
  newest: "primary_release_date.desc",
};

/** Floor applied when sorting by rating, so a film with three votes cannot top the list. */
export const RATING_SORT_MIN_VOTES = 200;

export interface DiscoverOptions {
  genreId?: number;
  sort?: DiscoverSort;
  page?: number;
  /** Only films released on or before this date (year-month-day). */
  releasedBefore?: string;
}

/** Browse by genre with a sort order, one page at a time. */
export function discoverMovies(
  { genreId, sort = "popularity", page = 1, releasedBefore }: DiscoverOptions,
  signal?: AbortSignal,
): Promise<TMDBPaginatedResponse<Movie>> {
  const params: QueryParams = {
    page,
    sort_by: DISCOVER_SORT_PARAM[sort],
    include_adult: false,
    include_video: false,
    with_genres: genreId,
    "primary_release_date.lte": releasedBefore,
  };
  if (sort === "rating") params["vote_count.gte"] = RATING_SORT_MIN_VOTES;
  return tmdbFetch<TMDBPaginatedResponse<Movie>>("/discover/movie", params, signal);
}

/** A person with their movie credits appended. Cached for 12 hours. */
export async function fetchPerson(
  id: number | string,
  signal?: AbortSignal,
): Promise<PersonWithCredits> {
  const { data } = await cachedFetch(cacheKey(["person", id]), 12 * HOUR, () =>
    tmdbFetch<PersonWithCredits>(
      `/person/${id}`,
      { append_to_response: "movie_credits" },
      signal,
    ),
  );
  return data;
}

// ---- helpers over the response shapes ----------------------------------

/** YouTube trailers and teasers, official ones first, newest first within each. */
export function pickTrailers(videos: readonly Video[] | undefined, max = 6): Video[] {
  if (!videos) return [];
  const rank = (v: Video) => (v.type === "Trailer" ? 0 : 1);
  return videos
    .filter((v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"))
    .sort((a, b) => {
      if (a.official !== b.official) return a.official ? -1 : 1;
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      return b.published_at.localeCompare(a.published_at);
    })
    .slice(0, max);
}

/** The director(s) from a crew list, deduplicated by id. */
export function pickDirectors(crew: readonly CrewMember[] | undefined): CrewMember[] {
  if (!crew) return [];
  const seen = new Set<number>();
  return crew.filter((c) => {
    if (c.job !== "Director" || seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

/** Top billed cast, in billing order. */
export function pickTopCast(cast: readonly CastMember[] | undefined, max = 12): CastMember[] {
  if (!cast) return [];
  return [...cast].sort((a, b) => a.order - b.order).slice(0, max);
}

/**
 * A person's filmography for display: acting and crew credits merged, one
 * entry per movie, newest first, undated titles last.
 */
export function buildFilmography(
  credits: PersonWithCredits["movie_credits"] | undefined,
): Movie[] {
  if (!credits) return [];
  const byId = new Map<number, Movie>();
  for (const credit of [...credits.cast, ...credits.crew]) {
    if (!byId.has(credit.id)) byId.set(credit.id, credit);
  }
  return [...byId.values()].sort((a, b) => {
    if (!a.release_date && !b.release_date) return b.popularity - a.popularity;
    if (!a.release_date) return 1;
    if (!b.release_date) return -1;
    return b.release_date.localeCompare(a.release_date);
  });
}
