import { Temporal } from "@js-temporal/polyfill";

import type { AddToCalendarButtonProps } from "@soonlist/cal/types";

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

export function getUserTimeZone(): string {
  return Temporal.Now.timeZoneId();
}

export function getDateTimeInfo(
  dateString: string,
  timeString: string,
): DateInfo | null {
  // Always use the user's local timezone
  const localTimezone = Temporal.Now.timeZoneId();

  // check is timestring is valid (HH:MM:SS)
  const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
  if (!timePattern.test(timeString)) {
    timeString += ":00";
  }
  if (!timePattern.test(timeString)) {
    timeString = "23:59:59";
  }

  try {
    const hasTime = timeString !== "";
    const zonedDateTime = Temporal.ZonedDateTime.from(
      `${dateString}${hasTime ? "T" : ""}${timeString}[${localTimezone}]`,
    );

    const dayOfWeek = daysOfWeekTemporal[zonedDateTime.dayOfWeek - 1];
    if (!dayOfWeek) {
      console.error("Invalid dayOfWeek / date format. Use YYYY-MM-DD.");
      return null;
    }
    const monthName = monthNames[zonedDateTime.month - 1];
    if (!monthName) {
      console.error("Invalid monthName / date format. Use YYYY-MM-DD.");
      return null;
    }
    const dateInfo = {
      month: zonedDateTime.month,
      monthName: monthName,
      day: zonedDateTime.day,
      year: zonedDateTime.year,
      dayOfWeek: dayOfWeek,
      hour: zonedDateTime.hour,
      minute: zonedDateTime.minute,
    } as DateInfo;

    return dateInfo;
  } catch (error) {
    console.error("Error parsing date:", error);
    return null;
  }
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
    return `Starts in ${hours} hour${hours === 1 ? "" : "s"} ${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  if (isToday) {
    return `Starts in ~${hours} hour${hours === 1 ? "" : "s"}`;
  }
  if (isTomorrow) {
    return `Tomorrow`;
  }
  return ``;
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
