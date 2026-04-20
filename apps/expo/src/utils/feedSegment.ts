/**
 * Upcoming vs Past for My Soonlist / My Scene tabs.
 *
 * `useStablePaginatedQuery` keeps the previous segment's rows while the new
 * query loads; filter by end time so we don't show the wrong tab's events.
 * `stableTimeMs` is from `useStableTimestamp` in the store (coarse "now").
 * This does not affect Convex caching — only which stale rows we show per tab.
 */
export function eventMatchesFeedSegment(
  endDateTime: string | Date,
  segment: "upcoming" | "past",
  stableTimeMs: number,
): boolean {
  const end = new Date(endDateTime).getTime();
  return segment === "upcoming" ? end >= stableTimeMs : end < stableTimeMs;
}
