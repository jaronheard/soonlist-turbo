import { Temporal } from "@js-temporal/polyfill";

/**
 * Deterministically pick the year for event dates that the model extracted
 * without an explicit year in the source.
 *
 * The model is unreliable at enforcing a date-window constraint in the prompt
 * (this caused the recurring "2027 date" bug — see migrations/fix2027Dates.ts
 * and migrations/fix2027FeedDates.ts). Instead of trusting the model, we have
 * it extract MM-DD and self-report whether the source explicitly stated a
 * year. If not, we compute the year ourselves: the soonest future instance
 * of that MM-DD relative to "today" in the user's timezone.
 *
 * Feb 29 inputs advance to the next leap year instead of silently clamping to
 * Feb 28. Events that span a year boundary (e.g. an NYE show that ends Jan 1)
 * are handled by advancing the end year until end >= start.
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

function parseYMD(value: string): { year: number; month: number; day: number } {
  const match = DATE_REGEX.exec(value);
  if (!match) throw new Error(`Expected YYYY-MM-DD, got: ${value}`);
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

/**
 * Earliest valid PlainDate for `month`/`day` starting at `startYear`, scanning
 * forward up to MAX_YEAR_OFFSET years. When `notBefore` is provided, the
 * returned date is also >= it. Uses overflow:"reject" so Feb 29 finds the
 * next leap year instead of silently clamping. Throws on truly invalid
 * month/day combinations (e.g. 13-40, 02-30).
 */
function findDate(
  startYear: number,
  month: number,
  day: number,
  notBefore?: Temporal.PlainDate,
): Temporal.PlainDate {
  for (let offset = 0; offset <= MAX_YEAR_OFFSET; offset++) {
    try {
      const candidate = Temporal.PlainDate.from(
        { year: startYear + offset, month, day },
        { overflow: "reject" },
      );
      if (!notBefore || Temporal.PlainDate.compare(candidate, notBefore) >= 0) {
        return candidate;
      }
    } catch {
      // Invalid for this year (e.g. Feb 29 in a non-leap year); try next.
    }
  }
  throw new Error(`Invalid month/day combination: ${month}-${day}`);
}

/**
 * Normalize event start/end dates.
 *
 * - Explicit year: trust the model's year on `startDate` (throws on an
 *   invalid date like Feb 29 of a non-leap year). The end year is always
 *   advanced if needed so NYE-style events with `end < start` stay
 *   consistent.
 * - Inferred year: replace `startDate`'s year with the soonest future year
 *   for its MM-DD relative to `today`; then pick `endDate`'s year so it
 *   remains on/after `startDate`.
 */
export function normalizeEventYear(
  input: NormalizeInput,
  today: Temporal.PlainDate,
): NormalizeOutput {
  const start = parseYMD(input.startDate);
  const end = parseYMD(input.endDate);

  const startDate = input.hasExplicitYear
    ? Temporal.PlainDate.from(
        { year: start.year, month: start.month, day: start.day },
        { overflow: "reject" },
      )
    : findDate(today.year, start.month, start.day, today);

  const endDate = findDate(startDate.year, end.month, end.day, startDate);

  return {
    startDate: startDate.toString(),
    endDate: endDate.toString(),
  };
}
