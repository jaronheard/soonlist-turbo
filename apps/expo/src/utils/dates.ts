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
 * Get DateInfo in the event's original timezone (not converted to user timezone).
 * This is useful for displaying the original event time alongside the converted time.
 */
export function getDateTimeInfoInTimezone(
  dateString: string,
  timeString: string,
  eventTimezone: string,
): DateInfo | null {
  // Validate input
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(dateString)) {
    logError("Invalid date format", new Error("Use YYYY-MM-DD."));
    return null;
  }

  // Ensure timeString is valid enough to parse
  timeString = coerceTimeString(timeString);

  const parseInTimezone =
    eventTimezone && eventTimezone !== "unknown"
      ? eventTimezone
      : getUserTimeZone();

  try {
    // Parse in event timezone and keep it in that timezone (don't convert)
    const zonedDateTime = Temporal.ZonedDateTime.from(
      `${dateString}T${timeString}[${parseInTimezone}]`,
    );
    // Keep it in the same timezone
    const localDateTime = zonedDateTime.withTimeZone(parseInTimezone);

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
 * Takes a date (YYYY-MM-DD), optional start/end times (HH:MM), and an event timezone.
 * Returns a user-facing { date, time } string pair in local time.
 * If timezones differ, returns { date, time, eventTime } for separate rendering.
 */
export function formatEventDateRange(
  date: string,
  startTime: string | undefined,
  endTime: string | undefined,
  eventTimezone: string,
  timezoneAbbreviation?: string,
): { date: string; time: string; eventTime?: string } {
  if (!date) return { date: "", time: "" };

  // Get local DateInfo for the start (converted to user timezone)
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

  // If timezone abbreviation is provided, return event time separately for italic styling
  if (timezoneAbbreviation && startTime) {
    // Get event timezone DateInfo (original timezone)
    const eventStartDateInfo = getDateTimeInfoInTimezone(
      date,
      startTime,
      eventTimezone || "unknown",
    );
    let eventTimeRange = "";

    if (eventStartDateInfo) {
      const eventStartTime = timeFormatDateInfo(eventStartDateInfo);

      if (endTime) {
        const eventEndDateInfo = getDateTimeInfoInTimezone(
          date,
          endTime,
          eventTimezone || "unknown",
        );
        if (eventEndDateInfo) {
          const eventEndTime = timeFormatDateInfo(eventEndDateInfo);
          eventTimeRange = `${eventStartTime} - ${eventEndTime}`;
        } else {
          eventTimeRange = eventStartTime;
        }
      } else {
        eventTimeRange = eventStartTime;
      }

      return {
        date: formattedDate,
        time: timeRange.trim(),
        eventTime: `(${eventTimeRange} ${timezoneAbbreviation})`,
      };
    }
  }

  return { date: formattedDate, time: timeRange.trim() };
}

/**
 * Takes a date (YYYY-MM-DD), optional start/end times (HH:MM), and an event timezone.
 * Returns a user-facing { date, time } string pair in local time, in a more compact format.
 */
export function formatEventDateRangeCompact(
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

  // More compact date format: "Mon, Jan 1"
  const formattedDate = `${startDateInfo.dayOfWeek.substring(0, 3)}, ${startDateInfo.monthName.substring(
    0,
    3,
  )} ${startDateInfo.day}`;

  // Handle time range formatting
  let formattedTime = "";
  if (startTime) {
    formattedTime = timeFormatDateInfo(startDateInfo);

    if (endTime) {
      const endDateInfo = getDateTimeInfo(
        date,
        endTime,
        eventTimezone || "unknown",
      );
      if (endDateInfo) {
        formattedTime += ` - ${timeFormatDateInfo(endDateInfo)}`;
      }
    }
  }

  return { date: formattedDate, time: formattedTime };
}

// --- Functions moved from date-picker/date-utils --- //

/**
 * Parses a time string (HH:mm or HH:mm:ss) into a Date object set to today's date
 * with the specified time. Defaults to midnight if parsing fails or input is empty.
 * Note: This uses the built-in Date object, not Temporal.
 */
export function parseTimeString(timeString?: string): Date {
  const date = new Date();
  // Default to midnight if no time string is provided
  date.setHours(0, 0, 0, 0);

  if (!timeString) return date; // Return midnight if empty

  try {
    const parts = timeString.split(":");
    // Allow for HH:mm or HH:mm:ss formats
    if (parts.length < 2) {
      logError(
        "Invalid time format in parseTimeString (less than 2 parts)",
        new Error(timeString),
      );
      return date; // Return midnight on invalid format
    }

    const hoursStr = parts[0]!;
    const minutesStr = parts[1]!;
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (!isNaN(hours) && !isNaN(minutes)) {
      // Set the parsed hours and minutes, keep date as today, seconds/ms as 0
      date.setHours(hours, minutes, 0, 0);
    } else {
      logError(
        "NaN parsing time parts in parseTimeString",
        new Error(timeString),
      );
      // Keep date defaulted to midnight if parsing results in NaN
    }
  } catch (error) {
    logError("Error parsing time in parseTimeString", error, { timeString });
    // Keep date defaulted to midnight on general error
  }

  return date;
}

/**
 * Formats a Date object into a YYYY-MM-DD string.
 * Note: This uses the built-in Date object, not Temporal.
 */
export function formatDateForStorage(date: Date): string {
  // Ensure date is valid before calling toISOString
  if (isNaN(date.getTime())) {
    logError(
      "Invalid Date object passed to formatDateForStorage",
      new Error("Invalid Date received"),
    );
    const today = new Date();
    return today.toISOString().split("T")[0] || ""; // Fallback to today
  }
  return date.toISOString().split("T")[0] || "";
}

/**
 * Formats a Date object into an HH:mm string (24-hour format).
 * Note: This uses the built-in Date object, not Temporal.
 */
export function formatTimeForStorage(date: Date): string {
  // Ensure date is valid before getting hours/minutes
  if (isNaN(date.getTime())) {
    logError(
      "Invalid Date object passed to formatTimeForStorage",
      new Error("Invalid Date received"),
    );
    return "00:00"; // Fallback
  }
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}
