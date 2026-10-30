import {
  buildFilmography,
  discoverMovies,
  fetchGenres,
  fetchLatestMovies,
  fetchMovieDetails,
  fetchMovieList,
  fetchPerson,
  fetchRecommendedMovies,
  fetchTrendingMovies,
  getImageUrl,
  getYouTubeThumbnail,
  getYouTubeUrl,
  pickDirectors,
  pickTopCast,
  pickTrailers,
  RATING_SORT_MIN_VOTES,
  searchMovies,
} from "../api";
import { clearCache } from "../cache";
import { resetSettings, updateSettings } from "../settings";

// The cache and the settings store both write to AsyncStorage; the official
// in-memory mock is enough here since these tests are about the requests.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const ENV_KEY = "EXPO_PUBLIC_TMDB_API_KEY";

type FetchCall = { url: string; init: RequestInit };

/** A minimal Response-like object; we only use `ok`, `status` and `json()`. */
function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function textResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: async () => {
      throw new Error("not json");
    },
  } as unknown as Response;
}

const page = (results: unknown[]) => ({
  page: 1,
  results,
  total_pages: 1,
  total_results: results.length,
});

let fetchMock: jest.Mock;
const originalFetch = globalThis.fetch;
const originalKey = process.env[ENV_KEY];

function lastCall(): FetchCall {
  const calls = fetchMock.mock.calls;
  const [url, init] = calls[calls.length - 1] as [string, RequestInit];
  return { url, init };
}

beforeEach(async () => {
  process.env[ENV_KEY] = "v3key123";
  fetchMock = jest.fn().mockResolvedValue(jsonResponse(page([])));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  // Every test starts with an empty cache and default settings, so each
  // call below really reaches the (mocked) network.
  await clearCache();
  resetSettings();
});

afterAll(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = originalKey;
});

describe("authentication", () => {
  it("sends a v3 key as the api_key query parameter", async () => {
    await fetchTrendingMovies();
    const { url, init } = lastCall();
    expect(new URL(url).searchParams.get("api_key")).toBe("v3key123");
    expect(init.headers).not.toHaveProperty("Authorization");
  });

  it("sends a v4 read-access token as a Bearer header", async () => {
    process.env[ENV_KEY] = "eyJhbGciOiJIUzI1NiJ9.fake.token";
    await fetchTrendingMovies();
    const { url, init } = lastCall();
    expect(new URL(url).searchParams.has("api_key")).toBe(false);
    expect(init.headers).toMatchObject({
      Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.fake.token",
    });
  });

  it("throws a helpful error and does not call fetch when the key is missing", async () => {
    delete process.env[ENV_KEY];
    await expect(fetchTrendingMovies()).rejects.toThrow(
      /Missing TMDB API key.*EXPO_PUBLIC_TMDB_API_KEY/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("always asks for JSON", async () => {
    await fetchTrendingMovies();
    expect(lastCall().init.headers).toMatchObject({
      accept: "application/json",
    });
  });
});

describe("settings", () => {
  it("sends the language from settings on every request", async () => {
    await searchMovies("x");
    expect(new URL(lastCall().url).searchParams.get("language")).toBe("en-US");

    updateSettings({ language: "fr-FR" });
    await searchMovies("x");
    expect(new URL(lastCall().url).searchParams.get("language")).toBe("fr-FR");
  });

  it("sends the region only for the lists that depend on it", async () => {
    updateSettings({ region: "GB" });
    await fetchMovieList("now_playing");
    expect(new URL(lastCall().url).searchParams.get("region")).toBe("GB");

    await fetchMovieList("upcoming", 2);
    expect(new URL(lastCall().url).searchParams.get("region")).toBe("GB");

    await fetchMovieList("top_rated");
    expect(new URL(lastCall().url).searchParams.has("region")).toBe(false);
  });

  it("refetches trending after the language changes", async () => {
    await fetchTrendingMovies();
    await fetchTrendingMovies();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    updateSettings({ language: "de-DE" });
    await fetchTrendingMovies();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("caching", () => {
  it("serves trending from the cache on a repeat call", async () => {
    const movies = [{ id: 1, title: "A" }];
    fetchMock.mockResolvedValueOnce(jsonResponse(page(movies)));

    await expect(fetchTrendingMovies()).resolves.toEqual(movies);
    await expect(fetchTrendingMovies()).resolves.toEqual(movies);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caches page 1 of a list but not later pages", async () => {
    await fetchMovieList("popular", 1);
    await fetchMovieList("popular", 1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await fetchMovieList("popular", 2);
    await fetchMovieList("popular", 2);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("serves stale details when the network fails afterwards", async () => {
    const details = { id: 5, title: "Five", genres: [] };
    fetchMock.mockResolvedValueOnce(jsonResponse(details));
    await fetchMovieDetails(5);

    // Expire the entry by moving the clock past the ttl, then fail the network.
    const realNow = Date.now;
    const spy = jest
      .spyOn(Date, "now")
      .mockImplementation(() => realNow() + 24 * 60 * 60 * 1000);
    fetchMock.mockRejectedValueOnce(new TypeError("Network request failed"));
    await expect(fetchMovieDetails(5)).resolves.toEqual(details);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it("does not cache search results", async () => {
    await searchMovies("a");
    await searchMovies("a");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("fetchTrendingMovies", () => {
  it("hits /trending/movie/day by default and unwraps results", async () => {
    const movies = [{ id: 1, title: "A" }];
    fetchMock.mockResolvedValueOnce(jsonResponse(page(movies)));

    await expect(fetchTrendingMovies()).resolves.toEqual(movies);
    expect(new URL(lastCall().url).pathname).toBe("/3/trending/movie/day");
  });

  it("supports the week window", async () => {
    await fetchTrendingMovies("week");
    expect(new URL(lastCall().url).pathname).toBe("/3/trending/movie/week");
  });
});

describe("fetchLatestMovies", () => {
  it("uses /movie/now_playing with a page parameter", async () => {
    await fetchLatestMovies(3);
    const url = new URL(lastCall().url);
    expect(url.pathname).toBe("/3/movie/now_playing");
    expect(url.searchParams.get("page")).toBe("3");
  });

  it("returns the whole page (results plus paging metadata)", async () => {
    const movies = [{ id: 1, title: "A" }];
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ page: 2, results: movies, total_pages: 7, total_results: 130 }),
    );

    await expect(fetchLatestMovies(2)).resolves.toEqual({
      page: 2,
      results: movies,
      total_pages: 7,
      total_results: 130,
    });
  });

  it("defaults to page 1", async () => {
    await fetchLatestMovies();
    expect(new URL(lastCall().url).searchParams.get("page")).toBe("1");
  });
});

describe("searchMovies", () => {
  it("encodes the trimmed query and excludes adult titles", async () => {
    await searchMovies("  the batman  ", 2);
    const url = new URL(lastCall().url);
    expect(url.pathname).toBe("/3/search/movie");
    expect(url.searchParams.get("query")).toBe("the batman");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("include_adult")).toBe("false");
  });

  it("handles characters that need URL encoding", async () => {
    await searchMovies("Fast & Furious: 9");
    expect(new URL(lastCall().url).searchParams.get("query")).toBe(
      "Fast & Furious: 9",
    );
  });

  it("returns the whole page (results plus paging metadata)", async () => {
    const movies = [{ id: 9, title: "Nine" }];
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ page: 1, results: movies, total_pages: 3, total_results: 41 }),
    );

    await expect(searchMovies("nine")).resolves.toEqual({
      page: 1,
      results: movies,
      total_pages: 3,
      total_results: 41,
    });
  });

  it("resolves to an empty page for a blank query without calling fetch", async () => {
    const emptyPage = { page: 1, results: [], total_pages: 0, total_results: 0 };
    await expect(searchMovies("   ")).resolves.toEqual(emptyPage);
    await expect(searchMovies("")).resolves.toEqual(emptyPage);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("fetchMovieDetails", () => {
  it("requests /movie/{id} with credits and videos appended and returns the body as-is", async () => {
    const details = { id: 42, title: "Answer", genres: [] };
    fetchMock.mockResolvedValueOnce(jsonResponse(details));

    await expect(fetchMovieDetails(42)).resolves.toEqual(details);
    const url = new URL(lastCall().url);
    expect(url.pathname).toBe("/3/movie/42");
    expect(url.searchParams.get("append_to_response")).toBe("credits,videos");
  });

  it("accepts a string id (as received from the route params)", async () => {
    await fetchMovieDetails("77");
    expect(new URL(lastCall().url).pathname).toBe("/3/movie/77");
  });

  it("forwards an AbortSignal to fetch", async () => {
    const controller = new AbortController();
    await fetchMovieDetails(1, controller.signal);
    expect(lastCall().init.signal).toBe(controller.signal);
  });
});

describe("fetchRecommendedMovies", () => {
  it("pages through /movie/{id}/recommendations", async () => {
    await fetchRecommendedMovies(12, 3);
    const url = new URL(lastCall().url);
    expect(url.pathname).toBe("/3/movie/12/recommendations");
    expect(url.searchParams.get("page")).toBe("3");
  });
});

describe("fetchGenres", () => {
  it("unwraps the genres array and caches it", async () => {
    const genres = [{ id: 28, name: "Action" }];
    fetchMock.mockResolvedValueOnce(jsonResponse({ genres }));

    await expect(fetchGenres()).resolves.toEqual(genres);
    expect(new URL(lastCall().url).pathname).toBe("/3/genre/movie/list");

    await expect(fetchGenres()).resolves.toEqual(genres);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("discoverMovies", () => {
  it("filters by genre and sorts by popularity by default", async () => {
    await discoverMovies({ genreId: 28 });
    const url = new URL(lastCall().url);
    expect(url.pathname).toBe("/3/discover/movie");
    expect(url.searchParams.get("with_genres")).toBe("28");
    expect(url.searchParams.get("sort_by")).toBe("popularity.desc");
    expect(url.searchParams.get("include_adult")).toBe("false");
    expect(url.searchParams.has("vote_count.gte")).toBe(false);
  });

  it("adds a vote floor when sorting by rating", async () => {
    await discoverMovies({ genreId: 18, sort: "rating", page: 2 });
    const url = new URL(lastCall().url);
    expect(url.searchParams.get("sort_by")).toBe("vote_average.desc");
    expect(url.searchParams.get("vote_count.gte")).toBe(String(RATING_SORT_MIN_VOTES));
    expect(url.searchParams.get("page")).toBe("2");
  });

  it("caps newest at a release date when asked", async () => {
    await discoverMovies({ sort: "newest", releasedBefore: "2024-06-01" });
    const url = new URL(lastCall().url);
    expect(url.searchParams.get("sort_by")).toBe("primary_release_date.desc");
    expect(url.searchParams.get("primary_release_date.lte")).toBe("2024-06-01");
    expect(url.searchParams.has("with_genres")).toBe(false);
  });
});

describe("fetchPerson", () => {
  it("appends movie credits and caches the person", async () => {
    const person = { id: 3, name: "Someone", movie_credits: { cast: [], crew: [] } };
    fetchMock.mockResolvedValueOnce(jsonResponse(person));

    await expect(fetchPerson(3)).resolves.toEqual(person);
    const url = new URL(lastCall().url);
    expect(url.pathname).toBe("/3/person/3");
    expect(url.searchParams.get("append_to_response")).toBe("movie_credits");

    await fetchPerson("3");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("error handling", () => {
  it("surfaces TMDB's status_message on a non-2xx response", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          success: false,
          status_code: 34,
          status_message: "The resource you requested could not be found.",
        },
        404,
      ),
    );
    await expect(fetchMovieDetails(999)).rejects.toThrow(
      "The resource you requested could not be found.",
    );
  });

  it("falls back to a generic message when the error body is not JSON", async () => {
    fetchMock.mockResolvedValueOnce(textResponse(502));
    await expect(fetchTrendingMovies()).rejects.toThrow(
      "TMDB request failed (502)",
    );
  });

  it("falls back to a generic message when the JSON body has no status_message", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ weird: true }, 500));
    await expect(fetchTrendingMovies()).rejects.toThrow(
      "TMDB request failed (500)",
    );
  });

  it("propagates network failures from fetch", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network request failed"));
    await expect(fetchTrendingMovies()).rejects.toThrow(
      "Network request failed",
    );
  });
});

describe("getImageUrl", () => {
  it("builds a w500 URL by default", () => {
    expect(getImageUrl("/poster.jpg")).toBe(
      "https://image.tmdb.org/t/p/w500/poster.jpg",
    );
  });

  it("accepts a size", () => {
    expect(getImageUrl("/poster.jpg", "w342")).toBe(
      "https://image.tmdb.org/t/p/w342/poster.jpg",
    );
  });

  it("returns null for missing paths", () => {
    expect(getImageUrl(null)).toBeNull();
    expect(getImageUrl(undefined)).toBeNull();
    expect(getImageUrl("")).toBeNull();
  });
});

describe("YouTube helpers", () => {
  it("builds watch and thumbnail URLs with the key encoded", () => {
    expect(getYouTubeUrl("ab c")).toBe("https://www.youtube.com/watch?v=ab%20c");
    expect(getYouTubeThumbnail("k1")).toBe("https://img.youtube.com/vi/k1/hqdefault.jpg");
  });
});

describe("pickTrailers", () => {
  const video = (overrides: Partial<Video>): Video => ({
    id: Math.random().toString(),
    key: "k",
    name: "v",
    site: "YouTube",
    type: "Trailer",
    official: true,
    published_at: "2024-01-01T00:00:00.000Z",
    ...overrides,
  });

  it("keeps only YouTube trailers and teasers", () => {
    const picked = pickTrailers([
      video({ key: "a", site: "Vimeo" }),
      video({ key: "b", type: "Featurette" }),
      video({ key: "c", type: "Teaser" }),
      video({ key: "d" }),
    ]);
    expect(picked.map((v) => v.key)).toEqual(["d", "c"]);
  });

  it("puts official first, then trailers before teasers, then newest", () => {
    const picked = pickTrailers([
      video({ key: "old", published_at: "2020-01-01T00:00:00.000Z" }),
      video({ key: "fan", official: false }),
      video({ key: "teaser", type: "Teaser" }),
      video({ key: "new", published_at: "2024-05-01T00:00:00.000Z" }),
    ]);
    expect(picked.map((v) => v.key)).toEqual(["new", "old", "teaser", "fan"]);
  });

  it("respects the limit and tolerates undefined", () => {
    const many = Array.from({ length: 10 }, (_, i) => video({ key: String(i) }));
    expect(pickTrailers(many, 3)).toHaveLength(3);
    expect(pickTrailers(undefined)).toEqual([]);
  });
});

describe("pickDirectors and pickTopCast", () => {
  const crew = (id: number, job: string): CrewMember => ({
    id,
    name: `Crew ${id}`,
    job,
    department: "Directing",
    profile_path: null,
  });
  const cast = (id: number, order: number): CastMember => ({
    id,
    name: `Cast ${id}`,
    character: "",
    profile_path: null,
    order,
    known_for_department: "Acting",
  });

  it("returns each director once", () => {
    const picked = pickDirectors([
      crew(1, "Producer"),
      crew(2, "Director"),
      crew(2, "Director"),
      crew(3, "Director"),
    ]);
    expect(picked.map((c) => c.id)).toEqual([2, 3]);
    expect(pickDirectors(undefined)).toEqual([]);
  });

  it("sorts cast by billing order and limits", () => {
    const picked = pickTopCast([cast(1, 2), cast(2, 0), cast(3, 1)], 2);
    expect(picked.map((c) => c.id)).toEqual([2, 3]);
    expect(pickTopCast(undefined)).toEqual([]);
  });
});

describe("buildFilmography", () => {
  const credit = (id: number, release_date: string, popularity = 1) =>
    ({ id, title: `M${id}`, release_date, popularity, credit_id: `c${id}` }) as PersonMovieCredit;

  it("merges cast and crew, one entry per movie, newest first, undated last", () => {
    const films = buildFilmography({
      cast: [credit(1, "2020-01-01"), credit(2, "2023-01-01")],
      crew: [credit(2, "2023-01-01"), credit(3, ""), credit(4, "2021-06-01"), credit(5, "", 9)],
    });
    expect(films.map((m) => m.id)).toEqual([2, 4, 1, 5, 3]);
    expect(buildFilmography(undefined)).toEqual([]);
  });
});
