import { Temporal } from "@js-temporal/polyfill";

import type { AddToCalendarButtonProps } from "@soonlist/cal/types";

import { logError } from "./errorLogging";

// Existing event defaults
export const blankEvent = {
  options: [
    "Apple",
    "Google",
    "iCal",
    "Microsoft365",
    "MicrosoftTeams",
    "Outlook.com",
    "Yahoo",
  ] as
    | (
        | "Apple"
        | "Google"
        | "iCal"
        | "Microsoft365"
        | "MicrosoftTeams"
        | "Outlook.com"
        | "Yahoo"
      )[]
    | undefined,
  buttonStyle: "text" as const,
  name: "Manual entry" as const,
  description: "" as const,
  location: "" as const,
  startDate: "today" as const,
  endDate: "" as const,
  startTime: "" as const,
  endTime: "" as const,
  timeZone: "" as const,
} as AddToCalendarButtonProps;

const daysOfWeekTemporal = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "Jul",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export interface DateInfo {
  month: number;
  day: number;
  year: number;
  dayOfWeek: string;
  monthName: string;
  hour: number;
  minute: number;
}

export function getUserTimeZone(): string {
  return Temporal.Now.timeZoneId();
}

/**
 * Safely parse a time string in HH:MM or HH:MM:SS format; if invalid, fallback.
 */
function coerceTimeString(timeString: string) {
  // Quick check for "empty" time
  if (!timeString) return "23:59:59";

  // Basic pattern check (HH:MM[:SS])
  const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  if (!timePattern.test(timeString)) {
    // Fallback to adding ":00" or final fallback
    if (!timeString.includes(":")) {
      timeString += ":00";
      if (timePattern.test(timeString)) return timeString;
    }
    return "23:59:59";
  }
  return timeString;
}

/**
 * Parse a date+time in the given event timezone (if provided), then convert to local time.
 * Returns a DateInfo object in the USER'S LOCAL TIME.
 */
export function getDateTimeInfo(
  dateString: string,
  timeString: string,
  eventTimezone?: string,
): DateInfo | null {
  // Validate input
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(dateString)) {
    logError("Invalid date format", new Error("Use YYYY-MM-DD."));
    return null;
  }

  // Ensure timeString is valid enough to parse
  timeString = coerceTimeString(timeString);

  const userTimezone = getUserTimeZone();
  const parseInTimezone =
    eventTimezone && eventTimezone !== "unknown" ? eventTimezone : userTimezone;

  try {
    // First parse in event timezone
    const zonedDateTime = Temporal.ZonedDateTime.from(
      `${dateString}T${timeString}[${parseInTimezone}]`,
    );
    // Convert to local time
    const localDateTime = zonedDateTime.withTimeZone(userTimezone);

    const dayOfWeek = daysOfWeekTemporal[localDateTime.dayOfWeek - 1];
    if (!dayOfWeek) {
      logError(
        "Invalid dayOfWeek / date format",
        new Error("Invalid dayOfWeek / date format. Use YYYY-MM-DD."),
      );
      return null;
    }
    const monthName = monthNames[localDateTime.month - 1];
    if (!monthName) {
      logError(
        "Invalid monthName / date format",
        new Error("Invalid monthName / date format. Use YYYY-MM-DD."),
      );
      return null;
    }

    return {
      month: localDateTime.month,
      day: localDateTime.day,
      year: localDateTime.year,
      dayOfWeek,
      monthName,
      hour: localDateTime.hour,
      minute: localDateTime.minute,
    };
  } catch (error) {
    logError("Error parsing date/time", error);
    return null;
  }
}

/**
 * Parse a date in the given event timezone (if provided), sets time to 00:00:00,
 * then converts to local time. Return a DateInfo in the user's local time.
 */
export function getDateInfo(
  dateString: string,
  eventTimezone?: string,
): DateInfo | null {
  return getDateTimeInfo(dateString, "00:00", eventTimezone);
}

/**
 * Check if an event that starts on `startDateInfo` and ends on `endDateInfo`
 * ends the next day (by local time) before 6am.
 */
export function endsNextDayBeforeMorning(
  startDateInfo: DateInfo | null,
  endDateInfo: DateInfo | null,
) {
  if (!startDateInfo || !endDateInfo) {
    return false;
  }
  const isNextDay =
    (startDateInfo.month === endDateInfo.month &&
      startDateInfo.day === endDateInfo.day - 1) ||
    (startDateInfo.month !== endDateInfo.month && endDateInfo.day === 1); // Rough check
  const isBeforeMorning = endDateInfo.hour < 6;
  return isNextDay && isBeforeMorning;
}

/**
 * Returns true if `startTime` is exactly tomorrow relative to `now`, from a
 * local calendar-date perspective.
 */
export function timeIsTomorrow(now: Date, startTime: Date): boolean {
  // Normalize the current date to midnight
  const normalizedNow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  // Normalize the startTime to midnight
  const normalizedStartTime = new Date(
    startTime.getFullYear(),
    startTime.getMonth(),
    startTime.getDate(),
  );

  // Difference in days
  const timeDifference =
    normalizedStartTime.getTime() - normalizedNow.getTime();
  const dayDifference = timeDifference / (1000 * 60 * 60 * 24);

  return dayDifference === 1;
}

export function eventTimesAreDefined(
  startTime: string | undefined,
  endTime: string | undefined,
) {
  return startTime !== undefined && endTime !== undefined;
}

/**
 * Check if the local start and end day differ. Used for multi-day checks.
 */
export function spansMultipleDays(
  startDateInfo: DateInfo | null,
  endDateInfo: DateInfo | null,
) {
  if (!startDateInfo || !endDateInfo) {
    return false;
  }
  return (
    startDateInfo.day !== endDateInfo.day ||
    startDateInfo.month !== endDateInfo.month ||
    startDateInfo.year !== endDateInfo.year
  );
}

/**
 * If an event extends into more than one local day, AND it's not just
 * "ends next day before 6am," returns true.
 */
export function showMultipleDays(
  startDateInfo: DateInfo | null,
  endDateInfo: DateInfo | null,
) {
  if (!startDateInfo || !endDateInfo) {
    return false;
  }
  return (
    spansMultipleDays(startDateInfo, endDateInfo) &&
    !endsNextDayBeforeMorning(startDateInfo, endDateInfo)
  );
}

/**
 * Format a raw "HH:MM" string (24-hour) into a 12-hour time with AM/PM.
 */
export function timeFormat(time?: string) {
  if (!time) {
    return "";
  }
  const [rawHours, rawMinutes] = time.split(":").map(Number);
  const hours = rawHours ?? 0;
  const minutes = rawMinutes ?? 0;
  const ampm = hours >= 12 ? "PM" : "AM";
  const twelveHour = hours % 12 || 12;
  return `${twelveHour}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

/**
 * Convert a DateInfo (already in local time) to a string like "6:30PM".
 */
export function timeFormatDateInfo(dateInfo: DateInfo) {
  let hours = dateInfo.hour;
  const minutes = dateInfo.minute;
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes.toString().padStart(2, "0")}${ampm}`;
}

/**
 * Return a very rough relative time string (e.g. "Starts in 2 hours")
 * assuming dateInfo is already in the user's local time.
 */
export function formatRelativeTime(dateInfo: DateInfo): string {
  const now = new Date();
  const startDate = new Date(
    dateInfo.year,
    dateInfo.month - 1,
    dateInfo.day,
    dateInfo.hour,
    dateInfo.minute,
  );

  const difference = startDate.getTime() - now.getTime();
  if (difference < 0) {
    return "Happening now";
  }

  // Days, hours, minutes until start
  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor(difference / (1000 * 60 * 60));
  const minutes = Math.floor(difference / (1000 * 60));

  const isSameDay = dateInfo.day === now.getDate();
  const isSameMonth = dateInfo.month - 1 === now.getMonth();
  const isSameYear = dateInfo.year === now.getFullYear();
  const isToday = isSameDay && isSameMonth && isSameYear;
  const tomorrowCheck = timeIsTomorrow(now, startDate);

  if (days === 0 && hours === 0) {
    return `Starts in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  if (days === 0 && hours < 1) {
    return `Starts in ${hours} hour${hours === 1 ? "" : "s"} ${minutes} minute${
      minutes === 1 ? "" : "s"
    }`;
  }
  if (isToday) {
    return `Starts in ~${hours} hour${hours === 1 ? "" : "s"}`;
  }
  if (tomorrowCheck) {
    return `Tomorrow`;
  }
  return "";
}

/**
 * Return true if the event is over (now > endDateInfo), using local times.
 */
export function isOver(endDateInfo: DateInfo): boolean {
  const now = new Date();
  const endDate = new Date(
    endDateInfo.year,
    endDateInfo.month - 1,
    endDateInfo.day,
    endDateInfo.hour,
    endDateInfo.minute,
  );
  return now > endDate;
}

/**
 * Takes a date (YYYY-MM-DD), optional start/end times (HH:MM), and an event timezone.
 * Returns a user-facing { date, time } string pair in local time.
 */
export function formatEventDateRange(
  date: string,
  startTime: string | undefined,
  endTime: string | undefined,
  eventTimezone: string,
): { date: string; time: string } {
  if (!date) return { date: "", time: "" };

  // Get local DateInfo for the start
  const startDateInfo = getDateTimeInfo(
    date,
    startTime || "",
    eventTimezone || "unknown",
  );
  if (!startDateInfo) return { date: "", time: "" };

  const formattedDate = `${startDateInfo.dayOfWeek.substring(0, 3)}, ${
    startDateInfo.monthName
  } ${startDateInfo.day}`;
  const formattedStartTime = startTime ? timeFormatDateInfo(startDateInfo) : "";

  // Handle end
  let formattedEndTime = "";
  if (endTime) {
    const endDateInfo = getDateTimeInfo(
      date,
      endTime,
      eventTimezone || "unknown",
    );
    if (endDateInfo) {
      formattedEndTime = timeFormatDateInfo(endDateInfo);
    }
  }

  const timeRange =
    startTime && endTime
      ? `${formattedStartTime} - ${formattedEndTime}`
      : formattedStartTime;

  return { date: formattedDate, time: timeRange.trim() };
}
