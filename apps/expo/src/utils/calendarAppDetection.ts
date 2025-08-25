import { Linking } from "react-native";
import { Temporal } from "@js-temporal/polyfill";

export type CalendarApp = "google" | "apple" | "system";

export interface CalendarAppInfo {
  id: CalendarApp;
  name: string;
  urlScheme: string;
  isInstalled: boolean;
}

/**
 * Checks if a specific calendar app is installed on the device
 * @param urlScheme The URL scheme to check
 * @returns Promise<boolean> True if the app is installed
 */
export const isAppInstalled = async (urlScheme: string): Promise<boolean> => {
  try {
    return await Linking.canOpenURL(urlScheme);
  } catch (error) {
    // If we get an error about LSApplicationQueriesSchemes, log it but don't treat as an error
    if (
      error instanceof Error &&
      error.message.includes("LSApplicationQueriesSchemes")
    ) {
      console.warn(
        `URL scheme ${urlScheme} not declared in LSApplicationQueriesSchemes. App detection may not work correctly.`,
      );
    } else {
      console.error("Error checking if app is installed:", error);
    }
    return false;
  }
};

/**
 * Detects which calendar apps are installed on the device
 * @returns Promise<CalendarAppInfo[]> Array of calendar app info
 */
export const detectCalendarApps = async (): Promise<CalendarAppInfo[]> => {
  const calendarApps: CalendarAppInfo[] = [
    {
      id: "google",
      name: "Google Calendar",
      urlScheme: "comgooglecalendar://",
      isInstalled: false,
    },
    {
      id: "apple",
      name: "Apple Calendar",
      urlScheme: "calshow://",
      isInstalled: false,
    },
  ];

  // Check which apps are installed in parallel for better performance
  const detectionPromises = calendarApps.map(async (app) => {
    app.isInstalled = await isAppInstalled(app.urlScheme);
    return app;
  });

  await Promise.all(detectionPromises);

  return calendarApps;
};

/**
 * Creates a Google Calendar URL with prefilled event details
 * @param event The event to add to Google Calendar
 * @returns string The Google Calendar URL
 */
export const createGoogleCalendarLink = (event: {
  name?: string;
  description?: string;
  location?: string;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  timeZone?: string;
}): string => {
  const text = encodeURIComponent(event.name || "");
  const details = encodeURIComponent(event.description || "");
  const location = encodeURIComponent(event.location || "");

  // Build dates for Google Calendar
  // For timed events: YYYYMMDDTHHMMSSZ/YYYYMMDDTHHMMSSZ (UTC)
  // For all-day events: YYYYMMDD/YYYYMMDD (end is exclusive)
  let dates = "";
  const tz = event.timeZone || Temporal.Now.timeZoneId();

  const formatUtcForGoogle = (zdt: Temporal.ZonedDateTime): string => {
    const instant = zdt.toInstant();
    const d = new Date(instant.epochMilliseconds);
    const yyyy = d.getUTCFullYear().toString();
    const mm = (d.getUTCMonth() + 1).toString().padStart(2, "0");
    const dd = d.getUTCDate().toString().padStart(2, "0");
    const hh = d.getUTCHours().toString().padStart(2, "0");
    const mi = d.getUTCMinutes().toString().padStart(2, "0");
    const ss = d.getUTCSeconds().toString().padStart(2, "0");
    return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
  };

  if (event.startDate) {
    const isAllDay = !event.startTime && !event.endTime;

    if (isAllDay) {
      // Use all-day format; Google expects end date exclusive
      const startPlain = event.startDate.replace(/-/g, "");
      const endBase = (event.endDate || event.startDate).replace(/-/g, "");
      const endDateObj = new Date(
        parseInt(endBase.substring(0, 4), 10),
        parseInt(endBase.substring(4, 6), 10) - 1,
        parseInt(endBase.substring(6, 8), 10),
      );
      endDateObj.setDate(endDateObj.getDate() + 1);
      const endExclusive = `${endDateObj.getFullYear()}${(
        endDateObj.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}${endDateObj.getDate().toString().padStart(2, "0")}`;
      dates = `${startPlain}/${endExclusive}`;
    } else {
      const startTime = event.startTime || "00:00:00";
      const endTime = event.endTime || (event.endDate ? "23:59:00" : undefined);

      const startZdt = Temporal.ZonedDateTime.from(
        `${event.startDate}T${startTime.length === 5 ? startTime + ":00" : startTime}[${tz}]`,
      );

      let endZdt: Temporal.ZonedDateTime;
      if (event.endDate) {
        const endTimeFinal = endTime || "23:59:00";
        endZdt = Temporal.ZonedDateTime.from(
          `${event.endDate}T${endTimeFinal.length === 5 ? endTimeFinal + ":00" : endTimeFinal}[${tz}]`,
        );
      } else {
        endZdt = startZdt.add({ hours: 1 });
      }

      dates = `${formatUtcForGoogle(startZdt)}/${formatUtcForGoogle(endZdt)}`;
    }
  }

  const ctz = encodeURIComponent(tz);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&location=${location}&dates=${dates}&ctz=${ctz}`;
};
