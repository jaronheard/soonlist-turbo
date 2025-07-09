/**
 * Client-side event status calculations
 * These replace server-side hasEnded calculations for offline support
 */

export type EventStatus = "ended" | "happening" | "upcoming";

export function getEventStatus(
  startTime: string | Date,
  endTime: string | Date,
  now: Date = new Date(),
): EventStatus {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const currentTime = now.getTime();

  if (currentTime >= end) {
    return "ended";
  } else if (currentTime >= start && currentTime < end) {
    return "happening";
  } else {
    return "upcoming";
  }
}

export function isEventEnded(
  endTime: string | Date,
  now: Date = new Date(),
): boolean {
  return new Date(endTime).getTime() < now.getTime();
}

export function isEventHappening(
  startTime: string | Date,
  endTime: string | Date,
  now: Date = new Date(),
): boolean {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const currentTime = now.getTime();

  return currentTime >= start && currentTime < end;
}

export function isEventUpcoming(
  startTime: string | Date,
  now: Date = new Date(),
): boolean {
  return new Date(startTime).getTime() > now.getTime();
}

/**
 * Get a human-readable label for event timing
 */
export function getEventTimingLabel(
  startTime: string | Date,
  endTime: string | Date,
  now: Date = new Date(),
): string {
  const status = getEventStatus(startTime, endTime, now);

  switch (status) {
    case "ended":
      return "Ended";
    case "happening":
      return "Happening now";
    case "upcoming": {
      const start = new Date(startTime);
      const daysUntil = Math.floor(
        (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysUntil === 0) {
        return "Today";
      } else if (daysUntil === 1) {
        return "Tomorrow";
      } else if (daysUntil < 7) {
        return `In ${daysUntil} days`;
      } else {
        return "Upcoming";
      }
    }
  }
}

/**
 * Check if cached data is stale (older than specified hours)
 */
export function isCacheStale(lastUpdated: number, maxAgeHours = 24): boolean {
  const ageInHours = (Date.now() - lastUpdated) / (1000 * 60 * 60);
  return ageInHours > maxAgeHours;
}
