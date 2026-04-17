import { Temporal } from "@js-temporal/polyfill";

// Pick the year for an event's MM-DD deterministically rather than trusting
// the model, which doesn't reliably enforce a date-window constraint in the
// prompt. See migrations/fix2027Dates.ts for the bug this replaces.

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

// Earliest valid PlainDate for month/day at or after startYear (and notBefore,
// if given). Scans forward so Feb 29 advances to the next leap year instead of
// clamping to Feb 28.
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
  throw new Error(
    `Could not find a valid date for month ${month}, day ${day} ` +
      `within ${MAX_YEAR_OFFSET} years of ${startYear}` +
      (notBefore ? ` on or after ${notBefore.toString()}` : ""),
  );
}

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

  const endStartYear = input.hasExplicitYear ? end.year : startDate.year;
  const endDate = findDate(endStartYear, end.month, end.day, startDate);

  return {
    startDate: startDate.toString(),
    endDate: endDate.toString(),
  };
}
