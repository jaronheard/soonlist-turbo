import { Temporal } from "@js-temporal/polyfill";

/**
 * Deterministically pick the year for event dates that the model extracted
 * without an explicit year in the source text or image.
 *
 * The model is unreliable at enforcing date-window constraints in the prompt
 * (this caused the recurring "2027 date" bug — see migrations/fix2027Dates.ts
 * and migrations/fix2027FeedDates.ts). Instead of trusting the model, we have
 * it extract MM-DD and report whether the source explicitly stated a year.
 * If not, we compute the year ourselves: the soonest future instance of the
 * MM-DD relative to the current date in the user's timezone.
 *
 * Leap-day (Feb 29) inputs are handled by scanning forward for the next year
 * in which the date actually exists, rather than silently clamping to Feb 28.
 * Events that span a year boundary (e.g. New Year's Eve shows that end on
 * Jan 1) are handled by advancing the end-date year until it is >= start.
 */

const DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const MAX_YEAR_OFFSET = 4;

interface NormalizeInput {
  startDate: string;
  endDate: string;
  hasExplicitYear: boolean;
}

interface NormalizeOutput {
  startDate: string;
  endDate: string;
}

/**
 * Compute the deterministic year for an MM-DD relative to today.
 * Scans forward up to MAX_YEAR_OFFSET years and returns the first year where
 * the MM-DD is a valid calendar date (handles Feb 29 in non-leap years) and
 * the resulting date is on or after today. Throws for truly invalid
 * month/day combinations (e.g. 13-40, 02-30) that cannot be satisfied in any
 * year within the window.
 */
export function pickYearForMonthDay(
  month: number,
  day: number,
  today: Temporal.PlainDate,
): number {
  for (let offset = 0; offset <= MAX_YEAR_OFFSET; offset++) {
    const year = today.year + offset;
    try {
      const candidate = Temporal.PlainDate.from(
        { year, month, day },
        { overflow: "reject" },
      );
      if (Temporal.PlainDate.compare(candidate, today) >= 0) {
        return year;
      }
    } catch {
      // Invalid combination for this year (e.g. Feb 29 in non-leap year); try next.
    }
  }
  throw new Error(`Invalid month/day combination: ${month}-${day}`);
}

/**
 * Try to construct a PlainDate for `month`/`day` starting at `startYear` and
 * scanning forward up to MAX_YEAR_OFFSET years with overflow:"reject". Returns
 * the first valid PlainDate, or throws if none of the candidate years accept
 * the month/day.
 */
function pickValidDate(
  startYear: number,
  month: number,
  day: number,
): Temporal.PlainDate {
  for (let offset = 0; offset <= MAX_YEAR_OFFSET; offset++) {
    try {
      return Temporal.PlainDate.from(
        { year: startYear + offset, month, day },
        { overflow: "reject" },
      );
    } catch {
      // Try next year.
    }
  }
  throw new Error(`Invalid month/day combination: ${month}-${day}`);
}

/**
 * Normalize event start/end dates.
 *
 * - If `hasExplicitYear` is true, trust the model's year. Still apply the
 *   end-after-start check so NYE-style events (end < start) get their end
 *   advanced by one year.
 * - Otherwise, replace the year on `startDate` with the soonest future year
 *   for its MM-DD, and compute `endDate` so that it remains >= startDate
 *   (handling events that span a year boundary, e.g. a late-night New Year's
 *   Eve show that ends Jan 1).
 *
 * The function preserves the YYYY-MM-DD shape. Construction uses
 * overflow:"reject" so Feb 29 is never silently clamped to Feb 28; instead the
 * year is advanced until the date exists. Throws on malformed input, which
 * should never happen because the schema has already validated it.
 */
export function normalizeEventYear(
  input: NormalizeInput,
  today: Temporal.PlainDate,
): NormalizeOutput {
  if (input.hasExplicitYear) {
    const start = parseDate(input.startDate);
    const end = parseDate(input.endDate);
    const startPd = Temporal.PlainDate.from(
      { year: start.year, month: start.month, day: start.day },
      { overflow: "reject" },
    );
    const endPd = Temporal.PlainDate.from(
      { year: end.year, month: end.month, day: end.day },
      { overflow: "reject" },
    );
    const adjustedEnd =
      Temporal.PlainDate.compare(endPd, startPd) < 0
        ? endPd.add({ years: 1 })
        : endPd;
    return {
      startDate: startPd.toString(),
      endDate: adjustedEnd.toString(),
    };
  }

  const start = parseDate(input.startDate);
  const end = parseDate(input.endDate);

  const startYear = pickYearForMonthDay(start.month, start.day, today);
  const normalizedStart = Temporal.PlainDate.from(
    { year: startYear, month: start.month, day: start.day },
    { overflow: "reject" },
  );

  let normalizedEnd = pickValidDate(startYear, end.month, end.day);
  if (Temporal.PlainDate.compare(normalizedEnd, normalizedStart) < 0) {
    normalizedEnd = pickValidDate(normalizedEnd.year + 1, end.month, end.day);
  }

  return {
    startDate: normalizedStart.toString(),
    endDate: normalizedEnd.toString(),
  };
}

function parseDate(value: string): {
  year: number;
  month: number;
  day: number;
} {
  const match = DATE_REGEX.exec(value);
  if (!match) {
    throw new Error(`Expected YYYY-MM-DD, got: ${value}`);
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}
