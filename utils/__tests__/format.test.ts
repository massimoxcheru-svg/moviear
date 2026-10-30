import {
  ageOn,
  formatCount,
  formatDate,
  formatMoney,
  formatRating,
  formatRuntime,
  formatYear,
  joinNames,
  todayYmd,
  truncate,
} from "../format";

describe("formatRuntime", () => {
  it("formats hours and minutes", () => {
    expect(formatRuntime(135)).toBe("2h 15m");
  });
  it("drops the zero part", () => {
    expect(formatRuntime(120)).toBe("2h");
    expect(formatRuntime(45)).toBe("45m");
  });
  it("returns null for missing or zero", () => {
    expect(formatRuntime(0)).toBeNull();
    expect(formatRuntime(null)).toBeNull();
    expect(formatRuntime(undefined)).toBeNull();
  });
});

describe("formatYear", () => {
  it("takes the leading year", () => {
    expect(formatYear("2024-03-12")).toBe("2024");
  });
  it("returns null for empty or odd input", () => {
    expect(formatYear("")).toBeNull();
    expect(formatYear(undefined)).toBeNull();
    expect(formatYear("soon")).toBeNull();
  });
});

describe("formatDate", () => {
  it("writes the day, month name and year", () => {
    expect(formatDate("2024-03-12")).toBe("12 March 2024");
    expect(formatDate("1999-12-01")).toBe("1 December 1999");
  });
  it("rejects anything that is not year-month-day", () => {
    expect(formatDate("2024-13-01")).toBeNull();
    expect(formatDate("12/03/2024")).toBeNull();
    expect(formatDate(null)).toBeNull();
  });
});

describe("formatRating", () => {
  it("keeps one decimal", () => {
    expect(formatRating(7.845)).toBe("7.8");
    expect(formatRating(10)).toBe("10.0");
  });
  it("says N/A when there is no vote", () => {
    expect(formatRating(0)).toBe("N/A");
    expect(formatRating(undefined)).toBe("N/A");
  });
});

describe("formatMoney", () => {
  it("compacts to K, M and B", () => {
    expect(formatMoney(850_000)).toBe("$850K");
    expect(formatMoney(150_000_000)).toBe("$150M");
    expect(formatMoney(2_300_000_000)).toBe("$2.3B");
  });
  it("keeps a decimal only below ten units", () => {
    expect(formatMoney(1_500_000)).toBe("$1.5M");
    expect(formatMoney(12_500_000)).toBe("$13M");
    expect(formatMoney(2_000_000)).toBe("$2M");
  });
  it("prints small amounts as they are", () => {
    expect(formatMoney(999)).toBe("$999");
  });
  it("returns null when TMDB does not know", () => {
    expect(formatMoney(0)).toBeNull();
    expect(formatMoney(null)).toBeNull();
  });
});

describe("formatCount", () => {
  it("compacts large numbers", () => {
    expect(formatCount(999)).toBe("999");
    expect(formatCount(1_200)).toBe("1.2K");
    expect(formatCount(1_000)).toBe("1K");
    expect(formatCount(2_500_000)).toBe("2.5M");
  });
  it("treats missing as zero", () => {
    expect(formatCount(undefined)).toBe("0");
  });
});

describe("ageOn", () => {
  it("counts whole years", () => {
    expect(ageOn("1990-06-15", "2024-06-14")).toBe(33);
    expect(ageOn("1990-06-15", "2024-06-15")).toBe(34);
  });
  it("returns null for bad input", () => {
    expect(ageOn(null, "2024-01-01")).toBeNull();
    expect(ageOn("1990-06-15", "")).toBeNull();
    expect(ageOn("2030-01-01", "2024-01-01")).toBeNull();
  });
});

describe("todayYmd", () => {
  it("zero pads month and day", () => {
    expect(todayYmd(new Date(2024, 0, 5))).toBe("2024-01-05");
  });
});

describe("truncate", () => {
  it("leaves short text alone", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });
  it("cuts at a word boundary when one is near the limit", () => {
    expect(truncate("the quick brown fox jumps", 16)).toBe("the quick brown...");
  });
  it("cuts mid word when the last space is too early", () => {
    expect(truncate("a verylongwordwithoutspaces", 12)).toBe("a verylongwo...");
  });
});

describe("joinNames", () => {
  it("joins with commas and a final and", () => {
    expect(joinNames(["A"])).toBe("A");
    expect(joinNames(["A", "B"])).toBe("A and B");
    expect(joinNames(["A", "B", "C", "D"])).toBe("A, B and C");
  });
  it("handles an empty list", () => {
    expect(joinNames([])).toBe("");
  });
});
