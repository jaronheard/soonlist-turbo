import { logError } from "~/utils/errorLogging";

// Helper to parse YYYY-MM-DD string into a local Date object
function parseDateStringToLocalDate(dateString: string): Date | null {
  try {
    const parts = dateString.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0]!, 10);
      const month = parseInt(parts[1]!, 10) - 1; // Month is 0-indexed
      const day = parseInt(parts[2]!, 10);

      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        const localDate = new Date(year, month, day);
        // Verify the date wasn't invalid (e.g., Feb 30th -> Mar 2nd)
        if (
          localDate.getFullYear() === year &&
          localDate.getMonth() === month &&
          localDate.getDate() === day
        ) {
          return localDate;
        }
      }
    }
    logError(
      "Failed to parse date string to local date",
      new Error(`Invalid date format or values: ${dateString}`),
    );
    return null; // Indicate parsing failure
  } catch (error) {
    logError("Error parsing date string to local date", error);
    return null;
  }
}

export function formatDateForDisplay(dateString?: string): string {
  if (!dateString) return "";

  // Use the new helper to parse as local date first
  const localDate = parseDateStringToLocalDate(dateString);

  if (!localDate) {
    // Fallback: Try original UTC-based parsing if local parsing fails,
    // but log that this fallback was used.
    try {
      const utcDate = new Date(`${dateString}T00:00:00`);
      if (!isNaN(utcDate.getTime())) {
        logError(
          "formatDateForDisplay fallback",
          new Error(
            `Used UTC fallback for formatting display date: ${dateString}`,
          ),
        );
        const options: Intl.DateTimeFormatOptions = {
          year: "numeric",
          month: "short",
          day: "numeric",
        };
        return utcDate.toLocaleDateString("en-US", options);
      }
    } catch (fallbackError) {
      logError("Error in formatDateForDisplay fallback", fallbackError);
    }
    // Ultimate fallback: return original string
    return dateString;
  }

  // Format the correctly parsed local date
  try {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    return localDate.toLocaleDateString("en-US", options);
  } catch (error) {
    logError("Error formatting display date", error);
    return dateString; // Fallback on formatting error
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

export function parseDateString(dateString?: string): Date {
  const defaultDate = new Date(); // Use current date as default

  if (!dateString) return defaultDate;

  const localDate = parseDateStringToLocalDate(dateString);

  if (localDate) {
    return localDate;
  }

  // Fallback if local parsing failed: Log and return default date.
  // Avoid returning potentially incorrect UTC-parsed date here,
  // as it's meant for the picker which relies on local time.
  logError(
    "parseDateString fallback",
    new Error(
      `Failed to parse date string locally, returning default date for: ${dateString}`,
    ),
  );
  return defaultDate;
}
