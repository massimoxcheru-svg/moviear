/**
 * TMDB API client.
 *
 * The key is read from EXPO_PUBLIC_TMDB_API_KEY (see .env.example). Both key
 * types TMDB hands out are accepted:
 *   - a v3 "API Key" is sent as the `api_key` query parameter
 *   - a v4 "API Read Access Token" (a JWT starting with "eyJ") is sent as a
 *     Bearer header
 */

export const TMDB_CONFIG = {
  BASE_URL: "https://api.themoviedb.org/3",
  IMAGE_BASE_URL: "https://image.tmdb.org/t/p",
} as const;

/** Read lazily (not at module load) so the key can be changed in tests. */
function getApiKey(): string {
  return process.env.EXPO_PUBLIC_TMDB_API_KEY ?? "";
}

export type PosterSize = "w185" | "w342" | "w500" | "w780" | "original";

/** Full image URL for a TMDB `poster_path` / `backdrop_path`, or null. */
export function getImageUrl(
  path: string | null | undefined,
  size: PosterSize = "w500",
): string | null {
  if (!path) return null;
  return `${TMDB_CONFIG.IMAGE_BASE_URL}/${size}${path}`;
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

  for (const [key, value] of Object.entries(params)) {
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

export type TrendingTimeWindow = "day" | "week";

/** Movies trending on TMDB today (or this week). */
export async function fetchTrendingMovies(
  timeWindow: TrendingTimeWindow = "day",
  signal?: AbortSignal,
): Promise<Movie[]> {
  const data = await tmdbFetch<TMDBPaginatedResponse<Movie>>(
    `/trending/movie/${timeWindow}`,
    {},
    signal,
  );
  return data.results;
}

/** An empty page, returned when a request is skipped (e.g. blank search). */
const EMPTY_PAGE: TMDBPaginatedResponse<Movie> = {
  page: 1,
  results: [],
  total_pages: 0,
  total_results: 0,
};

/**
 * Latest releases, one page at a time (20 per page; `total_pages` tells the
 * caller when to stop). Uses /movie/now_playing because TMDB's /movie/latest
 * returns a single, usually obscure, record.
 */
export function fetchLatestMovies(
  page = 1,
  signal?: AbortSignal,
): Promise<TMDBPaginatedResponse<Movie>> {
  return tmdbFetch<TMDBPaginatedResponse<Movie>>(
    "/movie/now_playing",
    { page },
    signal,
  );
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

/** Full details for a single movie. */
export async function fetchMovieDetails(
  id: number | string,
  signal?: AbortSignal,
): Promise<MovieDetails> {
  return tmdbFetch<MovieDetails>(`/movie/${id}`, {}, signal);
}
