import * as Localization from "expo-localization";
import { Temporal } from "@js-temporal/polyfill";

import type { AddToCalendarButtonProps } from "@soonlist/cal/types";

import { logError } from "./errorLogging";

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
  try {
    const calendars = Localization.getCalendars();
    const expoTimeZone = calendars?.[0]?.timeZone;
    if (expoTimeZone) {
      return expoTimeZone;
    }
  } catch (e) {
    logError("Error getting timezone from expo-localization", e);
  }
  return Temporal.Now.timeZoneId();
}

function coerceTimeString(timeString: string) {
  if (!timeString) return "23:59:59";

  const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  if (!timePattern.test(timeString)) {
    if (!timeString.includes(":")) {
      timeString += ":00";
      if (timePattern.test(timeString)) return timeString;
    }
    return "23:59:59";
  }
  return timeString;
}

export function getDateTimeInfo(
  dateString: string,
  timeString: string,
  eventTimezone?: string,
): DateInfo | null {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(dateString)) {
    logError("Invalid date format", new Error("Use YYYY-MM-DD."));
    return null;
  }

  timeString = coerceTimeString(timeString);

  const userTimezone = getUserTimeZone();
  const parseInTimezone =
    eventTimezone && eventTimezone !== "unknown" ? eventTimezone : userTimezone;

  try {
    const zonedDateTime = Temporal.ZonedDateTime.from(
      `${dateString}T${timeString}[${parseInTimezone}]`,
    );
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

export function getDateInfo(
  dateString: string,
  eventTimezone?: string,
): DateInfo | null {
  return getDateTimeInfo(dateString, "00:00", eventTimezone);
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
    (startDateInfo.month !== endDateInfo.month && endDateInfo.day === 1);
  const isBeforeMorning = endDateInfo.hour < 6;
  return isNextDay && isBeforeMorning;
}

export function timeIsTomorrow(now: Date, startTime: Date): boolean {
  const normalizedNow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  const normalizedStartTime = new Date(
    startTime.getFullYear(),
    startTime.getMonth(),
    startTime.getDate(),
  );

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
  const [rawHours, rawMinutes] = time.split(":").map(Number);
  const hours = rawHours ?? 0;
  const minutes = rawMinutes ?? 0;
  const ampm = hours >= 12 ? "PM" : "AM";
  const twelveHour = hours % 12 || 12;
  return `${twelveHour}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

export function timeFormatDateInfo(dateInfo: DateInfo) {
  let hours = dateInfo.hour;
  const minutes = dateInfo.minute;
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
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
  if (difference < 0) {
    return "Happening now";
  }

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

export function getDateTimeInfoInTimezone(
  dateString: string,
  timeString: string,
  eventTimezone: string,
): DateInfo | null {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(dateString)) {
    logError("Invalid date format", new Error("Use YYYY-MM-DD."));
    return null;
  }

  timeString = coerceTimeString(timeString);

  const parseInTimezone =
    eventTimezone && eventTimezone !== "unknown"
      ? eventTimezone
      : getUserTimeZone();

  try {
    const zonedDateTime = Temporal.ZonedDateTime.from(
      `${dateString}T${timeString}[${parseInTimezone}]`,
    );
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

export function formatEventDateRange(
  date: string,
  startTime: string | undefined,
  endTime: string | undefined,
  eventTimezone: string,
  timezoneAbbreviation?: string,
): { date: string; time: string; eventTime?: string } {
  if (!date) return { date: "", time: "" };

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

  if (timezoneAbbreviation && startTime) {
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

export function formatEventDateRangeCompact(
  date: string,
  startTime: string | undefined,
  endTime: string | undefined,
  eventTimezone: string,
): { date: string; time: string } {
  if (!date) return { date: "", time: "" };

  const startDateInfo = getDateTimeInfo(
    date,
    startTime || "",
    eventTimezone || "unknown",
  );
  if (!startDateInfo) return { date: "", time: "" };

  const formattedDate = `${startDateInfo.dayOfWeek.substring(0, 3)}, ${startDateInfo.monthName.substring(
    0,
    3,
  )} ${startDateInfo.day}`;

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


export function parseTimeString(timeString?: string): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);

  if (!timeString) return date;

  try {
    const parts = timeString.split(":");
    if (parts.length < 2) {
      logError(
        "Invalid time format in parseTimeString (less than 2 parts)",
        new Error(timeString),
      );
      return date;
    }

    const hoursStr = parts[0]!;
    const minutesStr = parts[1]!;
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (!isNaN(hours) && !isNaN(minutes)) {
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

export function formatDateForStorage(date: Date): string {
  if (isNaN(date.getTime())) {
    logError(
      "Invalid Date object passed to formatDateForStorage",
      new Error("Invalid Date received"),
    );
    const today = new Date();
    return today.toISOString().split("T")[0] || "";
  }
  return date.toISOString().split("T")[0] || "";
}

export function formatTimeForStorage(date: Date): string {
  if (isNaN(date.getTime())) {
    logError(
      "Invalid Date object passed to formatTimeForStorage",
      new Error("Invalid Date received"),
    );
    return "00:00";
  }
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}
