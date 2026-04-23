export function eventMatchesFeedSegment(
  endDateTime: string | Date,
  segment: "upcoming" | "past",
  stableTimeMs: number,
): boolean {
  const end = new Date(endDateTime).getTime();
  return segment === "upcoming" ? end >= stableTimeMs : end < stableTimeMs;
}
