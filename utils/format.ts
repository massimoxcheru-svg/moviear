/**
 * Small, dependency free formatters for values that come back from TMDB.
 * Everything here is pure so it can be unit tested without React.
 */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "2h 15m", "45m", or null when the runtime is missing or zero. */
export function formatRuntime(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  const whole = Math.round(minutes);
  const h = Math.floor(whole / 60);
  const m = whole % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** The year of a TMDB date string ("2024-03-12" to "2024"), or null. */
export function formatYear(date: string | null | undefined): string | null {
  if (!date) return null;
  const match = /^(\d{4})/.exec(date);
  return match ? match[1] : null;
}

/**
 * "12 March 2024" from a TMDB date string. TMDB dates are plain
 * year-month-day with no timezone, so this avoids Date entirely and the
 * off by one day problems it brings on devices west of UTC.
 */
export function formatDate(date: string | null | undefined): string | null {
  if (!date) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const [, year, month, day] = match;
  const monthIndex = Number(month) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return `${Number(day)} ${MONTHS[monthIndex]} ${year}`;
}

/** One decimal place ("7.8"); "N/A" when there is no vote yet. */
export function formatRating(vote: number | null | undefined): string {
  if (!vote || vote <= 0) return "N/A";
  return vote.toFixed(1);
}

/**
 * Compact dollar amounts for budgets and box office: "$150M", "$2.3B",
 * "$850K". Returns null for zero or missing, which is what TMDB sends when
 * it simply does not know.
 */
export function formatMoney(amount: number | null | undefined): string | null {
  if (!amount || amount <= 0) return null;
  const units: [number, string][] = [
    [1_000_000_000, "B"],
    [1_000_000, "M"],
    [1_000, "K"],
  ];
  for (const [size, suffix] of units) {
    if (amount >= size) {
      const value = amount / size;
      const text = value >= 10 ? Math.round(value).toString() : value.toFixed(1);
      return `$${text.replace(/\.0$/, "")}${suffix}`;
    }
  }
  return `$${amount}`;
}

/** Vote counts and similar: 999 stays "999", 1200 becomes "1.2K", 2500000 "2.5M". */
export function formatCount(count: number | null | undefined): string {
  if (!count || count <= 0) return "0";
  if (count < 1_000) return String(count);
  if (count < 1_000_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

/**
 * Age in whole years on a given day, for a person's profile. Returns null if
 * either date is missing or malformed.
 */
export function ageOn(
  birthday: string | null | undefined,
  on: string | null | undefined,
): number | null {
  const b = parseYmd(birthday);
  const o = parseYmd(on);
  if (!b || !o) return null;
  let age = o.y - b.y;
  if (o.m < b.m || (o.m === b.m && o.d < b.d)) age -= 1;
  return age < 0 ? null : age;
}

function parseYmd(value: string | null | undefined) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

/** Today's date as "YYYY-MM-DD" in the device's local time. */
export function todayYmd(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Cut text at a word boundary and add an ellipsis. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const kept = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${kept.trimEnd()}...`;
}

/** Join the first `max` names with commas: "A, B and C". */
export function joinNames(names: readonly string[], max = 3): string {
  const picked = names.slice(0, max);
  if (picked.length === 0) return "";
  if (picked.length === 1) return picked[0];
  const last = picked[picked.length - 1];
  return `${picked.slice(0, -1).join(", ")} and ${last}`;
}
