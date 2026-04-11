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
 */

const DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

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
 * Returns today's year if the MM-DD falls on or after today's MM-DD,
 * otherwise the next year (i.e., the soonest future instance).
 */
export function pickYearForMonthDay(
  month: number,
  day: number,
  today: Temporal.PlainDate,
): number {
  const candidate = Temporal.PlainDate.from({
    year: today.year,
    month,
    day,
  });
  return Temporal.PlainDate.compare(candidate, today) >= 0
    ? today.year
    : today.year + 1;
}

/**
 * Normalize event start/end dates.
 *
 * - If `hasExplicitYear` is true, trust the model's year and return the dates
 *   unchanged (this is the only path that can produce dates outside the
 *   upcoming-year window, e.g. "March 15, 2028").
 * - Otherwise, replace the year on `startDate` with the soonest future year
 *   for its MM-DD, and compute `endDate` so that it remains >= startDate
 *   (handling events that span a year boundary, e.g. a late-night New Year's
 *   Eve show that ends Jan 1).
 *
 * The function preserves the YYYY-MM-DD shape and throws on malformed input,
 * which should never happen because the schema has already validated it.
 */
export function normalizeEventYear(
  input: NormalizeInput,
  today: Temporal.PlainDate,
): NormalizeOutput {
  if (input.hasExplicitYear) {
    return { startDate: input.startDate, endDate: input.endDate };
  }

  const start = parseDate(input.startDate);
  const end = parseDate(input.endDate);

  const startYear = pickYearForMonthDay(start.month, start.day, today);
  const normalizedStart = Temporal.PlainDate.from({
    year: startYear,
    month: start.month,
    day: start.day,
  });

  let normalizedEnd = Temporal.PlainDate.from({
    year: startYear,
    month: end.month,
    day: end.day,
  });
  if (Temporal.PlainDate.compare(normalizedEnd, normalizedStart) < 0) {
    normalizedEnd = normalizedEnd.add({ years: 1 });
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
