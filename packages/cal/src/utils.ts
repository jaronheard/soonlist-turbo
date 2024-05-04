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
    console.error("Invalid time format. Use HH:MM:SS.");
    timeString = "23:59:59``";
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
