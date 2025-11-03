import { Temporal } from "@js-temporal/polyfill";

import type { AddToCalendarButtonProps } from "./types";

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

const daysOfWeek = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

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

export function getDateTimeInfo(
  dateString: string,
  timeString: string,
  timezone: string,
  userTimezone?: string,
): DateInfo | null {
  // timezone cannot be "unknown"
  const timezonePattern = /^((?!unknown).)*$/;
  if (!timezonePattern.test(timezone)) {
    console.error("Invalid timezone, assuming America/Los_Angeles.");
    timezone = "America/Los_Angeles";
  }
  if (!userTimezone) {
    userTimezone = timezone;
  }
  if (!timezonePattern.test(userTimezone)) {
    console.error("Invalid userTimezone, assuming America/Los_Angeles.");
    userTimezone = "America/Los_Angeles";
  }

  // check is timestring is valid (HH:MM:SS)
  const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  if (!timePattern.test(timeString)) {
    console.log("Possibly invalid time format. Adding seconds...");
    timeString += ":00";
  }
  if (!timePattern.test(timeString)) {
    console.log("Invalid time format. Using default time.");
    timeString = "23:59:59";
  }

  const hasTime = timeString !== "";
  const zonedDateTime = Temporal.ZonedDateTime.from(
    `${dateString}${hasTime ? "T" : ""}${timeString}[${timezone}]`,
  );
  const userZonedDateTime = zonedDateTime.withTimeZone(
    userTimezone || timezone,
  );

  const dayOfWeek = daysOfWeekTemporal[userZonedDateTime.dayOfWeek - 1];
  if (!dayOfWeek) {
    console.error("Invalid dayOfWeek / date format. Use YYYY-MM-DD.");
    return null;
  }
  const monthName = monthNames[userZonedDateTime.month - 1];
  if (!monthName) {
    console.error("Invalid monthName / date format. Use YYYY-MM-DD.");
    return null;
  }
  const dateInfo = {
    month: userZonedDateTime.month,
    monthName: monthName,
    day: userZonedDateTime.day,
    year: userZonedDateTime.year,
    dayOfWeek: dayOfWeek,
    hour: userZonedDateTime.hour,
    minute: userZonedDateTime.minute,
  } as DateInfo;

  return dateInfo;
}

export function getDateInfo(dateString: string): DateInfo | null {
  // Validate input
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(dateString)) {
    console.error("Invalid date format. Use YYYY-MM-DD.");
    return null;
  }

  // Create a Date object
  const date = new Date(dateString);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.error("Invalid date.");
    return null;
  }

  // Get month, day, and year
  const month = date.getMonth() + 1; // Months are zero-based
  const day = date.getDate();
  const year = date.getFullYear();
  const hour = date.getHours();
  const minute = date.getMinutes();

  const dayOfWeek = daysOfWeek[date.getDay()];
  if (!dayOfWeek) {
    console.error("Invalid dayOfWeek / date format. Use YYYY-MM-DD.");
    return null;
  }

  const monthName = monthNames[date.getMonth()];
  if (!monthName) {
    console.error("Invalid monthName / date format. Use YYYY-MM-DD.");
    return null;
  }

  return { month, monthName, day, year, dayOfWeek, hour, minute };
}
export function getDateInfoUTC(dateString: string): DateInfo | null {
  // Validate input
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(dateString)) {
    console.error("Invalid date format. Use YYYY-MM-DD.");
    return null;
  }

  // Create a Date object in UTC
  const date = new Date(`${dateString}T00:00:00Z`);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.error("Invalid date.");
    return null;
  }

  // Get month, day, and year
  const month = date.getUTCMonth() + 1; // Months are zero-based
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();

  // Get day of the week
  const dayOfWeek = daysOfWeek[date.getUTCDay()];
  if (!dayOfWeek) {
    console.error("Invalid dayOfWeek / date format. Use YYYY-MM-DD.");
    return null;
  }

  const monthName = monthNames[date.getUTCMonth()];
  if (!monthName) {
    console.error("Invalid monthName / date format. Use YYYY-MM-DD.");
    return null;
  }

  return { month, monthName, day, year, dayOfWeek, hour, minute };
}

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
    (startDateInfo.month !== endDateInfo.month && endDateInfo.day === 1); //TODO: this is a hack
  const isBeforeMorning = endDateInfo.hour < 6;
  return isNextDay && isBeforeMorning;
}

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

  // Calculate the difference in time
  const timeDifference =
    normalizedStartTime.getTime() - normalizedNow.getTime();

  // Convert the time difference to days
  const dayDifference = timeDifference / (1000 * 60 * 60 * 24);

  // Check if the difference is exactly 1 day
  return dayDifference === 1;
}

export function eventTimesAreDefined(
  startTime: string | undefined,
  endTime: string | undefined,
) {
  return startTime !== undefined && endTime !== undefined;
}

export function spansMultipleDays(
  startDateInfo: DateInfo | null,
  endDateInfo: DateInfo | null,
) {
  if (!startDateInfo || !endDateInfo) {
    return false;
  }
  const notSameDay = startDateInfo.day !== endDateInfo.day;
  return notSameDay;
}

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

export function timeFormat(time?: string) {
  if (!time) {
    return "";
  }
  // eslint-disable-next-line prefer-const
  let [hours, minutes] = time.split(":").map(Number);
  if (hours === undefined || minutes === undefined) {
    return "";
  }
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours === 0 ? 12 : hours; // Convert 0 to 12 for 12 AM
  return `${hours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

export function timeFormatDateInfo(dateInfo: DateInfo) {
  let hours = dateInfo.hour;
  const minutes = dateInfo.minute;
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours === 0 ? 12 : hours; // Convert 0 to 12 for 12 AM
  return `${hours}:${minutes.toString().padStart(2, "0")}${ampm}`;
}

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
  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor(difference / (1000 * 60 * 60));
  const minutes = Math.floor(difference / (1000 * 60));

  const isSameDay = dateInfo.day === now.getDate();
  const isSameMonth = dateInfo.month - 1 === now.getMonth();
  const isSameYear = dateInfo.year === now.getFullYear();
  const isToday = isSameDay && isSameMonth && isSameYear;
  const isTomorrow = timeIsTomorrow(now, startDate);

  if (difference < 0) {
    return "Happening now";
  }

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
  if (isTomorrow) {
    return `Tomorrow`;
  }
  return ``;
}

/**
 * Get timezone abbreviation (e.g., "PST", "EST", "EDT") for a given timezone.
 * Uses Intl.DateTimeFormat with timeZoneName: 'short' to get the abbreviation.
 * Uses current date/time - for event-specific times, use getTimezoneAbbreviationAt.
 */
export function getTimezoneAbbreviation(timezone: string): string {
  if (!timezone || timezone === "unknown" || timezone.trim() === "") {
    return "";
  }

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    });
    const parts = formatter.formatToParts(new Date());
    const timeZoneNamePart = parts.find((part) => part.type === "timeZoneName");
    return timeZoneNamePart?.value || "";
  } catch (error) {
    console.error(
      `Error getting timezone abbreviation for ${timezone}:`,
      error,
    );
    return "";
  }
}

/**
 * Get timezone abbreviation at a specific date/time.
 * This is needed for accurate DST-aware abbreviations (e.g., PDT vs PST).
 */
export function getTimezoneAbbreviationAt(
  timezone: string,
  dateInfo: DateInfo,
): string {
  if (!timezone || timezone === "unknown" || timezone.trim() === "") {
    return "";
  }

  try {
    // Create a ZonedDateTime in the event's timezone at the specified date/time
    const zonedDateTime = Temporal.ZonedDateTime.from({
      timeZone: timezone,
      year: dateInfo.year,
      month: dateInfo.month,
      day: dateInfo.day,
      hour: dateInfo.hour,
      minute: dateInfo.minute,
      second: 0,
      millisecond: 0,
    });

    // Convert to an Instant, then to a JavaScript Date
    const instant = zonedDateTime.toInstant();
    const jsDate = new Date(instant.epochMilliseconds);

    // Use Intl.DateTimeFormat to get the abbreviation for this specific moment
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "short",
    });
    const parts = formatter.formatToParts(jsDate);
    const timeZoneNamePart = parts.find((part) => part.type === "timeZoneName");
    return timeZoneNamePart?.value || "";
  } catch (error) {
    console.error(
      `Error getting timezone abbreviation for ${timezone} at ${dateInfo.year}-${dateInfo.month}-${dateInfo.day}:`,
      error,
    );
    return "";
  }
}

/**
 * Check if a DST change occurs between start and end times in the given timezone.
 * Returns true if the UTC offset differs between start and end.
 */
export function didDstChangeBetween(
  timezone: string,
  start: DateInfo,
  end?: DateInfo,
): boolean {
  if (!timezone || timezone === "unknown" || timezone.trim() === "") {
    return false;
  }

  if (!end) {
    return false;
  }

  try {
    // Create ZonedDateTime for start
    const startZdt = Temporal.ZonedDateTime.from({
      timeZone: timezone,
      year: start.year,
      month: start.month,
      day: start.day,
      hour: start.hour,
      minute: start.minute,
      second: 0,
      millisecond: 0,
    });

    // Create ZonedDateTime for end
    const endZdt = Temporal.ZonedDateTime.from({
      timeZone: timezone,
      year: end.year,
      month: end.month,
      day: end.day,
      hour: end.hour,
      minute: end.minute,
      second: 0,
      millisecond: 0,
    });

    // Compare UTC offsets - if they differ, DST changed
    return startZdt.offsetNanoseconds !== endZdt.offsetNanoseconds;
  } catch (error) {
    console.error(
      `Error checking DST change between ${start.year}-${start.month}-${start.day} and ${end.year}-${end.month}-${end.day} in ${timezone}:`,
      error,
    );
    return false;
  }
}

/**
 * Get DateInfo in the event's original timezone (not converted to user timezone).
 * This is useful for displaying the original event time alongside the converted time.
 */
export function getDateTimeInfoInTimezone(
  dateString: string,
  timeString: string,
  timezone: string,
): DateInfo | null {
  // Call getDateTimeInfo with the same timezone for both parameters to keep it in original timezone
  return getDateTimeInfo(dateString, timeString, timezone, timezone);
}

/**
 * Format time range with optional event timezone display.
 * Returns an object with userTime and optional eventTime for flexible rendering.
 */
export function formatCompactTimeRangeWithEventTimezone(
  start: DateInfo,
  end: DateInfo,
  eventTimezoneStart?: DateInfo,
  eventTimezoneEnd?: DateInfo,
  timezoneAbbreviation?: string,
): { userTime: string; eventTime?: string } {
  const formatHour = (hour: number): string => {
    const h = hour % 12 || 12;
    return h.toString();
  };

  const formatMinute = (minute: number): string =>
    minute === 0 ? "" : `:${minute.toString().padStart(2, "0")}`;

  const startHour = formatHour(start.hour);
  const startMinute = formatMinute(start.minute);
  const endHour = formatHour(end.hour);
  const endMinute = formatMinute(end.minute);
  const startPeriod = start.hour < 12 ? "AM" : "PM";
  const endPeriod = end.hour < 12 ? "AM" : "PM";

  let timeRange: string;
  if (startPeriod === endPeriod) {
    timeRange = `${startHour}${startMinute}–${endHour}${endMinute}${startPeriod}`;
  } else {
    timeRange = `${startHour}${startMinute}${startPeriod}–${endHour}${endMinute}${endPeriod}`;
  }

  // If event timezone info is provided, return both
  if (eventTimezoneStart && timezoneAbbreviation) {
    const eventStartHour = formatHour(eventTimezoneStart.hour);
    const eventStartMinute = formatMinute(eventTimezoneStart.minute);
    const eventStartPeriod = eventTimezoneStart.hour < 12 ? "AM" : "PM";

    let eventTimeRange: string;
    if (eventTimezoneEnd) {
      const eventEndHour = formatHour(eventTimezoneEnd.hour);
      const eventEndMinute = formatMinute(eventTimezoneEnd.minute);
      const eventEndPeriod = eventTimezoneEnd.hour < 12 ? "AM" : "PM";

      if (eventStartPeriod === eventEndPeriod) {
        eventTimeRange = `${eventStartHour}${eventStartMinute}–${eventEndHour}${eventEndMinute}${eventStartPeriod}`;
      } else {
        eventTimeRange = `${eventStartHour}${eventStartMinute}${eventStartPeriod}–${eventEndHour}${eventEndMinute}${eventEndPeriod}`;
      }
    } else {
      eventTimeRange = `${eventStartHour}${eventStartMinute}${eventStartPeriod}`;
    }

    return {
      userTime: timeRange,
      eventTime: `${eventTimeRange} ${timezoneAbbreviation}`,
    };
  }

  return { userTime: timeRange };
}

export function formatCompactTimeRange(
  start: DateInfo,
  end: DateInfo,
  eventTimezoneStart?: DateInfo,
  eventTimezoneEnd?: DateInfo,
  timezoneAbbreviation?: string,
): string {
  const result = formatCompactTimeRangeWithEventTimezone(
    start,
    end,
    eventTimezoneStart,
    eventTimezoneEnd,
    timezoneAbbreviation,
  );

  if (result.eventTime) {
    return `${result.userTime} (${result.eventTime})`;
  }

  return result.userTime;
}
