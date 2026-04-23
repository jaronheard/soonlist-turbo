import { logError } from "~/utils/errorLogging";
import { getDateInfo, timeFormat } from "../../utils/dates";

export function formatDateForDisplay(dateString?: string): string {
  if (!dateString) return "";

  // Use the Temporal-based helper to parse as local date first
  const dateInfo = getDateInfo(dateString);

  if (!dateInfo) {
    // getDateInfo handles logging errors, return original string as fallback
    logError(
      "formatDateForDisplay failed to get DateInfo",
      new Error(`Input: ${dateString}`),
    );
    return dateString;
  }

  // Format the correctly parsed local date using a Date object constructed from DateInfo
  try {
    // Construct Date object for formatting (month needs -1 adjustment)
    const localDate = new Date(dateInfo.year, dateInfo.month - 1, dateInfo.day);
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    // Verify date construction before formatting
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
      return dateString; // Fallback
    }
  } catch (error) {
    logError("Error formatting display date", error);
    return dateString; // Fallback on formatting error
  }
}

export function formatTimeForDisplay(timeString?: string): string {
  // Use the general timeFormat utility directly
  return timeFormat(timeString);
}

export function parseDateString(dateString?: string): Date {
  const defaultDate = new Date(); // Use current date as default

  if (!dateString) return defaultDate;

  // Use Temporal-based parser
  const dateInfo = getDateInfo(dateString);

  if (dateInfo) {
    // Construct a Date object from the local components provided by DateInfo
    const localDate = new Date(dateInfo.year, dateInfo.month - 1, dateInfo.day);
    // Verify construction
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

  // getDateInfo logs internally if parsing fails initially
  // Log specifically that we are falling back here
  logError(
    "parseDateString returning default date",
    new Error(
      `Failed to parse date string or reconstruct Date object for: ${dateString}`,
    ),
  );
  return defaultDate;
}
