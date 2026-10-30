/**
 * Scheduled publishing (brief R5 §2.3). A post whose `date` lies after the
 * build day is "scheduled": the production and release builds leave it out
 * completely (pages, feeds, sitemap, search index, llms.txt, JSON-LD, tag and
 * category counts), dev and test builds show it with a "scheduled" badge.
 *
 * Days are compared as calendar days in Europe/Berlin, so a post dated
 * 2026-11-05 appears in the first build on or after 00:00 Berlin time that
 * day, whatever the time zone of the machine that builds it.
 *
 * Plain TypeScript without imports: Astro uses it at build time, and the
 * Node check scripts import the same file directly (tools/check-scheduled.mjs,
 * tools/build.mjs), so both sides agree on what "today" means.
 */

export const SCHEDULE_TZ = "Europe/Berlin";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const formatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: SCHEDULE_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The calendar day (YYYY-MM-DD) of an instant in Europe/Berlin. */
export function berlinDay(instant: Date): string {
  if (Number.isNaN(instant.valueOf())) throw new Error("invalid date");
  return formatter.format(instant);
}

/**
 * The day a post appears. A bare frontmatter date (`2026-11-05`) is parsed
 * as UTC midnight, which is the same calendar day in Berlin (UTC+1/+2); a
 * full timestamp is converted to its Berlin day.
 */
export function postDay(date: Date): string {
  return berlinDay(date);
}

/**
 * The build day. `override` (BUILD_DATE) may be a day (YYYY-MM-DD, taken as a
 * Berlin day) or an ISO instant (converted to its Berlin day); anything else
 * throws, so a typo never silently means "today".
 */
export function resolveBuildDay(
  override: string | undefined = process.env.BUILD_DATE,
  now: Date = new Date(),
): string {
  const value = override?.trim();
  if (!value) return berlinDay(now);
  if (DAY.test(value)) {
    const check = new Date(`${value}T12:00:00Z`);
    if (Number.isNaN(check.valueOf()) || check.toISOString().slice(0, 10) !== value)
      throw new Error(`BUILD_DATE "${value}" is not a valid day`);
    return value;
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const instant = new Date(value);
    if (!Number.isNaN(instant.valueOf())) return berlinDay(instant);
  }
  throw new Error(`BUILD_DATE "${value}" is neither YYYY-MM-DD nor an ISO timestamp`);
}

/** True if a post dated `date` must not be published yet on `buildDay`. */
export function isScheduled(date: Date, buildDay: string): boolean {
  return postDay(date) > buildDay;
}
