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
 * slowly (trending, genres, details, people) go through the response cache;
 * pass `force` to skip it (pull to refresh).
 */

import { cachedFetch, DAY, HOUR, MINUTE } from "./cache";
import { getSettings } from "./settings";

export const TMDB_CONFIG = {
  BASE_URL: "https://api.themoviedb.org/3",
  IMAGE_BASE_URL: "https://image.tmdb.org/t/p",
  SITE_URL: "https://www.themoviedb.org",
} as const;

/** Read lazily (not at module load) so the key can be changed in tests. */
function getApiKey(): string {
  return process.env.EXPO_PUBLIC_TMDB_API_KEY ?? "";
}

export interface FetchOptions {
  signal?: AbortSignal;
  /** Skip a fresh cache entry and hit the network. */
  force?: boolean;
}

export type PosterSize = "w185" | "w342" | "w500" | "w780" | "original";
export type ProfileSize = "w185" | "h632" | "original";
export type ImageSize = PosterSize | ProfileSize | "w92" | "w1280";

/** Full image URL for a TMDB `poster_path` / `backdrop_path`, or null. */
export function getImageUrl(
  path: string | null | undefined,
  size: ImageSize = "w500",
): string | null {
  if (!path) return null;
  return `${TMDB_CONFIG.IMAGE_BASE_URL}/${size}${path}`;
}

/** One step down from each size, for the data saver setting. */
const SMALLER: Record<ImageSize, ImageSize> = {
  w92: "w92",
  w185: "w92",
  w342: "w185",
  w500: "w342",
  w780: "w500",
  w1280: "w780",
  h632: "w185",
  original: "w780",
};

/** The size to actually request, honouring the data saver setting. */
export function pickImageSize(size: ImageSize): ImageSize {
  return getSettings().dataSaver ? SMALLER[size] : size;
}

/** Like getImageUrl but sized for the data saver setting. */
export function getImageUrlForSetting(
  path: string | null | undefined,
  size: ImageSize,
): string | null {
  return getImageUrl(path, pickImageSize(size));
}

/** Watch page for a YouTube video key, as TMDB hands them out. */
export function getYouTubeUrl(key: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(key)}`;
}

/** Thumbnail for a YouTube video key. */
export function getYouTubeThumbnail(key: string): string {
  return `https://img.youtube.com/vi/${encodeURIComponent(key)}/hqdefault.jpg`;
}

/** Public TMDB page for a movie, used when sharing. */
export function getMovieUrl(id: number | string): string {
  return `${TMDB_CONFIG.SITE_URL}/movie/${id}`;
}

export function getPersonUrl(id: number | string): string {
  return `${TMDB_CONFIG.SITE_URL}/person/${id}`;
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
  { signal, force }: FetchOptions = {},
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
    { force },
  );
  return data;
}

/** An empty page, returned when a request is skipped (e.g. blank search). */
const EMPTY_PAGE = {
  page: 1,
  results: [],
  total_pages: 0,
  total_results: 0,
};

export type MovieListKind = "now_playing" | "popular" | "top_rated" | "upcoming";

export const MOVIE_LIST_TITLES: Record<MovieListKind, string> = {
  now_playing: "Now playing",
  popular: "Popular",
  top_rated: "Top rated",
  upcoming: "Coming soon",
};

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
  { signal, force }: FetchOptions = {},
): Promise<TMDBPaginatedResponse<Movie>> {
  const { region } = getSettings();
  const params: QueryParams = { page };
  if (REGIONAL_LISTS.includes(kind)) params.region = region;

  const request = () =>
    tmdbFetch<TMDBPaginatedResponse<Movie>>(`/movie/${kind}`, params, signal);

  if (page !== 1) return request();
  return cachedFetch(cacheKey(["list", kind, region, page]), 15 * MINUTE, request, {
    force,
  }).then((r) => r.data);
}

/**
 * Latest releases. Uses /movie/now_playing because TMDB's /movie/latest
 * returns a single, usually obscure, record.
 */
export function fetchLatestMovies(
  page = 1,
  options: FetchOptions = {},
): Promise<TMDBPaginatedResponse<Movie>> {
  return fetchMovieList("now_playing", page, options);
}

/**
 * Search movies by title, one page at a time. A blank query resolves to an
 * empty page without hitting the network.
 */
export async function searchMovies(
  query: string,
  page = 1,
  { signal }: FetchOptions = {},
): Promise<TMDBPaginatedResponse<Movie>> {
  const trimmed = query.trim();
  if (!trimmed) return EMPTY_PAGE;

  return tmdbFetch<TMDBPaginatedResponse<Movie>>(
    "/search/movie",
    { query: trimmed, page, include_adult: false },
    signal,
  );
}

/** Search people by name, one page at a time. Blank queries skip the network. */
export async function searchPeople(
  query: string,
  page = 1,
  { signal }: FetchOptions = {},
): Promise<TMDBPaginatedResponse<PersonSummary>> {
  const trimmed = query.trim();
  if (!trimmed) return EMPTY_PAGE;

  return tmdbFetch<TMDBPaginatedResponse<PersonSummary>>(
    "/search/person",
    { query: trimmed, page, include_adult: false },
    signal,
  );
}

/** Everything the details screen needs, in one request. */
export const DETAILS_APPEND =
  "credits,videos,release_dates,keywords,images,external_ids,watch/providers";

/**
 * Full details for a single movie with cast, videos, certifications,
 * keywords, images, external ids and watch providers appended, so the
 * details screen needs one request. Cached for 12 hours.
 */
export async function fetchMovieDetails(
  id: number | string,
  { signal, force }: FetchOptions = {},
): Promise<MovieDetails> {
  const { data } = await cachedFetch(
    cacheKey(["movie", id]),
    12 * HOUR,
    () =>
      tmdbFetch<MovieDetails>(
        `/movie/${id}`,
        {
          append_to_response: DETAILS_APPEND,
          // Backdrops are mostly textless; ask for the language's posters
          // plus the textless ones so the gallery has something to show.
          include_image_language: `${getSettings().language.split("-")[0]},null`,
        },
        signal,
      ),
    { force },
  );
  return data;
}

/** Movies TMDB recommends alongside `id`, one page at a time. */
export function fetchRecommendedMovies(
  id: number | string,
  page = 1,
  { signal }: FetchOptions = {},
): Promise<TMDBPaginatedResponse<Movie>> {
  return tmdbFetch<TMDBPaginatedResponse<Movie>>(
    `/movie/${id}/recommendations`,
    { page },
    signal,
  );
}

/** User reviews for a movie, one page at a time. */
export function fetchMovieReviews(
  id: number | string,
  page = 1,
  { signal }: FetchOptions = {},
): Promise<TMDBPaginatedResponse<Review>> {
  return tmdbFetch<TMDBPaginatedResponse<Review>>(`/movie/${id}/reviews`, { page }, signal);
}

/** A collection (film series) with its parts. Cached for a day. */
export async function fetchCollection(
  id: number | string,
  { signal, force }: FetchOptions = {},
): Promise<Collection> {
  const { data } = await cachedFetch(
    cacheKey(["collection", id]),
    DAY,
    () => tmdbFetch<Collection>(`/collection/${id}`, {}, signal),
    { force },
  );
  return data;
}

/** The official movie genre list. Cached for a week. */
export async function fetchGenres({ signal, force }: FetchOptions = {}): Promise<Genre[]> {
  const { data } = await cachedFetch(
    cacheKey(["genres"]),
    7 * DAY,
    async () => {
      const body = await tmdbFetch<{ genres: Genre[] }>("/genre/movie/list", {}, signal);
      return body.genres;
    },
    { force },
  );
  return data;
}

export type DiscoverSort = "popularity" | "rating" | "newest" | "revenue" | "title";

export const DISCOVER_SORT_LABELS: Record<DiscoverSort, string> = {
  popularity: "Popular",
  rating: "Top rated",
  newest: "Newest",
  revenue: "Box office",
  title: "A to Z",
};

const DISCOVER_SORT_PARAM: Record<DiscoverSort, string> = {
  popularity: "popularity.desc",
  rating: "vote_average.desc",
  newest: "primary_release_date.desc",
  revenue: "revenue.desc",
  title: "title.asc",
};

/** Floor applied when sorting by rating, so a film with three votes cannot top the list. */
export const RATING_SORT_MIN_VOTES = 200;
/** Floor applied when the user asks for a minimum rating. */
export const MIN_RATING_MIN_VOTES = 50;

export interface DiscoverOptions {
  genreId?: number;
  /** Several genres: results must match all of them. */
  genreIds?: readonly number[];
  keywordId?: number;
  sort?: DiscoverSort;
  page?: number;
  /** Only films released on or before this date (year-month-day). */
  releasedBefore?: string;
  /** Inclusive release year bounds. */
  yearFrom?: number;
  yearTo?: number;
  /** 0 to 10. Adds a vote floor so a handful of votes cannot qualify. */
  minRating?: number;
  /** Shortest and longest runtime in minutes. */
  runtimeMin?: number;
  runtimeMax?: number;
}

/** Browse with filters and a sort order, one page at a time. */
export function discoverMovies(
  {
    genreId,
    genreIds,
    keywordId,
    sort = "popularity",
    page = 1,
    releasedBefore,
    yearFrom,
    yearTo,
    minRating,
    runtimeMin,
    runtimeMax,
  }: DiscoverOptions,
  { signal }: FetchOptions = {},
): Promise<TMDBPaginatedResponse<Movie>> {
  const genres = [...(genreIds ?? []), ...(genreId !== undefined ? [genreId] : [])];
  const params: QueryParams = {
    page,
    sort_by: DISCOVER_SORT_PARAM[sort],
    include_adult: false,
    include_video: false,
    with_genres: genres.length ? genres.join(",") : undefined,
    with_keywords: keywordId,
    "primary_release_date.lte": releasedBefore,
    "primary_release_date.gte": yearFrom !== undefined ? `${yearFrom}-01-01` : undefined,
    "with_runtime.gte": runtimeMin,
    "with_runtime.lte": runtimeMax,
  };
  if (yearTo !== undefined) {
    const upper = `${yearTo}-12-31`;
    params["primary_release_date.lte"] =
      releasedBefore && releasedBefore < upper ? releasedBefore : upper;
  }
  if (minRating !== undefined && minRating > 0) {
    params["vote_average.gte"] = minRating;
    params["vote_count.gte"] = MIN_RATING_MIN_VOTES;
  }
  if (sort === "rating") params["vote_count.gte"] = RATING_SORT_MIN_VOTES;
  return tmdbFetch<TMDBPaginatedResponse<Movie>>("/discover/movie", params, signal);
}

/** A person with their movie credits and external ids appended. Cached for 12 hours. */
export async function fetchPerson(
  id: number | string,
  { signal, force }: FetchOptions = {},
): Promise<PersonWithCredits> {
  const { data } = await cachedFetch(
    cacheKey(["person", id]),
    12 * HOUR,
    () =>
      tmdbFetch<PersonWithCredits>(
        `/person/${id}`,
        { append_to_response: "movie_credits,external_ids" },
        signal,
      ),
    { force },
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
 * The age certification for a region ("PG-13", "15"), falling back to the
 * US one, then to any region that has one. Theatrical releases are
 * preferred over premieres and digital releases.
 */
export function pickCertification(
  releaseDates: ReleaseDatesResponse | undefined,
  region: string,
): string | null {
  if (!releaseDates) return null;
  const byRegion = new Map(releaseDates.results.map((r) => [r.iso_3166_1, r.release_dates]));
  const candidates = [region, "US", ...byRegion.keys()];
  for (const code of candidates) {
    const dates = byRegion.get(code);
    if (!dates) continue;
    const withCert = dates.filter((d) => d.certification.trim() !== "");
    if (withCert.length === 0) continue;
    const theatrical = withCert.find((d) => d.type === 3);
    return (theatrical ?? withCert[0]).certification.trim();
  }
  return null;
}

export type ProviderKind = "flatrate" | "free" | "ads" | "rent" | "buy";

export const PROVIDER_KIND_LABELS: Record<ProviderKind, string> = {
  flatrate: "Stream",
  free: "Free",
  ads: "Free with ads",
  rent: "Rent",
  buy: "Buy",
};

export interface WatchOptions {
  link: string;
  groups: { kind: ProviderKind; providers: WatchProvider[] }[];
}

/**
 * Where to watch in the user's region, grouped and ordered the way TMDB
 * displays them. Null when nothing is available there.
 */
export function pickWatchProviders(
  response: WatchProvidersResponse | undefined,
  region: string,
): WatchOptions | null {
  const entry = response?.results[region];
  if (!entry) return null;
  const kinds: ProviderKind[] = ["flatrate", "free", "ads", "rent", "buy"];
  const groups = kinds
    .map((kind) => ({
      kind,
      providers: [...(entry[kind] ?? [])].sort(
        (a, b) => a.display_priority - b.display_priority,
      ),
    }))
    .filter((g) => g.providers.length > 0);
  if (groups.length === 0) return null;
  return { link: entry.link, groups };
}

/** Best voted backdrops first, deduplicated by path. */
export function pickBackdrops(images: MovieImages | undefined, max = 10): MovieImage[] {
  if (!images) return [];
  const seen = new Set<string>();
  return [...images.backdrops]
    .sort((a, b) => b.vote_average - a.vote_average || b.vote_count - a.vote_count)
    .filter((img) => {
      if (seen.has(img.file_path)) return false;
      seen.add(img.file_path);
      return true;
    })
    .slice(0, max);
}

export interface ExternalLink {
  label: string;
  url: string;
}

/** Clickable links for a movie's or person's external ids. */
export function buildExternalLinks(
  ids: ExternalIds | undefined,
  homepage?: string | null,
): ExternalLink[] {
  const links: ExternalLink[] = [];
  if (homepage) links.push({ label: "Website", url: homepage });
  if (!ids) return links;
  if (ids.imdb_id) links.push({ label: "IMDb", url: `https://www.imdb.com/title/${ids.imdb_id}/` });
  if (ids.instagram_id) {
    links.push({ label: "Instagram", url: `https://www.instagram.com/${ids.instagram_id}/` });
  }
  if (ids.twitter_id) links.push({ label: "X", url: `https://x.com/${ids.twitter_id}` });
  if (ids.facebook_id) {
    links.push({ label: "Facebook", url: `https://www.facebook.com/${ids.facebook_id}` });
  }
  return links;
}

/** IMDb ids for people live under /name/, not /title/. */
export function buildPersonLinks(ids: ExternalIds | undefined, homepage?: string | null) {
  return buildExternalLinks(ids, homepage).map((link) =>
    link.label === "IMDb" && ids?.imdb_id
      ? { ...link, url: `https://www.imdb.com/name/${ids.imdb_id}/` }
      : link,
  );
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

/** The parts of a collection in release order, the given movie included. */
export function sortCollectionParts(parts: readonly Movie[]): Movie[] {
  return [...parts].sort((a, b) => {
    if (!a.release_date) return 1;
    if (!b.release_date) return -1;
    return a.release_date.localeCompare(b.release_date);
  });
}
