import { logError } from "~/utils/errorLogging";

export function formatDateForDisplay(dateString?: string): string {
  if (!dateString) return "";

  try {
    const date = new Date(`${dateString}T00:00:00`);
    if (isNaN(date.getTime())) return dateString;

    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  } catch (error) {
    logError("Error formatting date", error);
    return dateString;
  }
}

export function formatTimeForDisplay(timeString?: string): string {
  if (!timeString) return "";

  try {
    const parts = timeString.split(":");
    if (parts.length < 2) return timeString;

    const hoursStr = parts[0]!;
    const minutesStr = parts[1]!;
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (isNaN(hours) || isNaN(minutes)) return timeString;

    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(0);

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    logError("Error formatting time", error);
    return timeString;
  }
}

export function parseTimeString(timeString?: string): Date {
  const date = new Date();
  if (!timeString) return date;

  try {
    const parts = timeString.split(":");
    if (parts.length !== 2) return date;

    const hoursStr = parts[0]!;
    const minutesStr = parts[1]!;
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (!isNaN(hours) && !isNaN(minutes)) {
      date.setHours(hours);
      date.setMinutes(minutes);
      date.setSeconds(0);
    }
  } catch (error) {
    logError("Error parsing time", error);
  }

  return date;
}

export function parseDateString(dateString?: string): Date {
  if (!dateString) return new Date();

  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) return date;
  } catch (error) {
    logError("Error parsing date", error);
  }

  return new Date();
}
