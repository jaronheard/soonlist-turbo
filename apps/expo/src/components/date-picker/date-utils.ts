import { logError } from "~/utils/errorLogging";
import {
  getDateInfo,
  parseTimeString as parseTimeStringFromDates,
  timeFormat,
} from "../../utils/dates";

export function formatDateForDisplay(dateString?: string): string {
  if (!dateString) return "";

  const dateInfo = getDateInfo(dateString);

  if (!dateInfo) {
    logError(
      "formatDateForDisplay failed to get DateInfo",
      new Error(`Input: ${dateString}`),
    );
    return dateString;
  }

  try {
    const localDate = new Date(dateInfo.year, dateInfo.month - 1, dateInfo.day);
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    if (
      localDate.getFullYear() === dateInfo.year &&
      localDate.getMonth() === dateInfo.month - 1 &&
      localDate.getDate() === dateInfo.day
    ) {
      return localDate.toLocaleDateString("en-US", options);
    } else {
      logError(
        "Failed to reconstruct local Date in formatDateForDisplay",
        new Error(`DateInfo: ${JSON.stringify(dateInfo)}`),
      );
      return dateString;
    }
  } catch (error) {
    logError("Error formatting display date", error);
    return dateString;
  }
}

export function formatTimeForDisplay(timeString?: string): string {
  return timeFormat(timeString);
}

export function parseDateString(dateString?: string): Date {
  const defaultDate = new Date();

  if (!dateString) return defaultDate;

  const dateInfo = getDateInfo(dateString);

  if (dateInfo) {
    const localDate = new Date(dateInfo.year, dateInfo.month - 1, dateInfo.day);
    if (
      localDate.getFullYear() === dateInfo.year &&
      localDate.getMonth() === dateInfo.month - 1 &&
      localDate.getDate() === dateInfo.day
    ) {
      return localDate;
    } else {
      logError(
        "Failed to reconstruct local Date from DateInfo in parseDateString",
        new Error(`DateInfo: ${JSON.stringify(dateInfo)}`),
      );
      // Fall through to return defaultDate if reconstruction fails
    }
  }

  logError(
    "parseDateString returning default date",
    new Error(
      `Failed to parse date string or reconstruct Date object for: ${dateString}`,
    ),
  );
  return defaultDate;
}

export const parseTimeString = parseTimeStringFromDates;
