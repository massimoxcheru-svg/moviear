import { decadeBreakdown, genreBreakdown, ratingSummary } from "../stats";

const genres: Genre[] = [
  { id: 28, name: "Action" },
  { id: 18, name: "Drama" },
  { id: 35, name: "Comedy" },
];

describe("genreBreakdown", () => {
  it("counts tags, orders by count then name, and reports shares", () => {
    const result = genreBreakdown(
      [{ genre_ids: [28, 18] }, { genre_ids: [18] }, { genre_ids: [35, 28] }],
      genres,
    );
    expect(result.map((r) => [r.genre.name, r.count])).toEqual([
      ["Action", 2],
      ["Drama", 2],
      ["Comedy", 1],
    ]);
    expect(result[0].share).toBeCloseTo(0.4);
  });

  it("ignores unknown genre ids and caps the list", () => {
    const result = genreBreakdown([{ genre_ids: [999, 28, 18, 35] }], genres, 2);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.genre.id !== 999)).toBe(true);
  });

  it("returns an empty list when nothing matches", () => {
    expect(genreBreakdown([], genres)).toEqual([]);
    expect(genreBreakdown([{ genre_ids: [1] }], genres)).toEqual([]);
  });
});

describe("ratingSummary", () => {
  it("averages the rated movies and builds a histogram", () => {
    const summary = ratingSummary([
      { rating: 8 },
      { rating: null },
      { rating: 6 },
      { rating: 8 },
    ]);
    expect(summary.rated).toBe(3);
    expect(summary.average).toBeCloseTo(22 / 3);
    expect(summary.histogram[8]).toBe(2);
    expect(summary.histogram[6]).toBe(1);
    expect(summary.histogram[10]).toBe(0);
  });

  it("has no average without ratings", () => {
    expect(ratingSummary([{ rating: null }])).toEqual({
      rated: 0,
      average: null,
      histogram: new Array(11).fill(0),
    });
  });
});

describe("decadeBreakdown", () => {
  it("groups by decade, most common first, newer decade first on ties", () => {
    const result = decadeBreakdown([
      { release_date: "1994-01-01" },
      { release_date: "1999-05-05" },
      { release_date: "2015-01-01" },
      { release_date: "2019-01-01" },
      { release_date: "2023-01-01" },
      { release_date: "" },
    ]);
    expect(result).toEqual([
      { decade: "2010s", count: 2 },
      { decade: "1990s", count: 2 },
      { decade: "2020s", count: 1 },
    ]);
  });
});
