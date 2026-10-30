import {
  fetchLatestMovies,
  fetchMovieDetails,
  fetchTrendingMovies,
  getImageUrl,
  searchMovies,
} from "../api";

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

beforeEach(() => {
  process.env[ENV_KEY] = "v3key123";
  fetchMock = jest.fn().mockResolvedValue(jsonResponse(page([])));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
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
  it("requests /movie/{id} and returns the body as-is", async () => {
    const details = { id: 42, title: "Answer", genres: [] };
    fetchMock.mockResolvedValueOnce(jsonResponse(details));

    await expect(fetchMovieDetails(42)).resolves.toEqual(details);
    expect(new URL(lastCall().url).pathname).toBe("/3/movie/42");
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
