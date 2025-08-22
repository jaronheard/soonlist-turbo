import { Linking } from "react-native";

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
}): string => {
  const text = encodeURIComponent(event.name || "");
  const details = encodeURIComponent(event.description || "");
  const location = encodeURIComponent(event.location || "");

  // Format dates for Google Calendar
  // Format: YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS
  let dates = "";

  if (event.startDate) {
    const startDate = event.startDate.replace(/-/g, "");
    const startTime = (event.startTime || "00:00").replace(/:/g, "");
    dates = `${startDate}T${startTime}00`;

    if (event.endDate) {
      const endDate = event.endDate.replace(/-/g, "");
      const endTime = (event.endTime || "23:59").replace(/:/g, "");
      dates += `/${endDate}T${endTime}00`;
    } else {
      // If no end date, use start date + 1 hour
      const timeParts = event.startTime?.split(":");
      const startTimeHour = timeParts?.[0] ? parseInt(timeParts[0], 10) : 0;
      const startTimeMinutes = timeParts?.[1] ? timeParts[1] : "00";

      // Handle hour overflow (23:xx -> 00:xx next day)
      let endHour = startTimeHour + 1;
      let endDateForCalculation = startDate;

      if (endHour >= 24) {
        endHour = 0;
        // Need to increment the date
        const dateObj = new Date(
          parseInt(startDate.substring(0, 4), 10), // year
          parseInt(startDate.substring(4, 6), 10) - 1, // month (0-indexed)
          parseInt(startDate.substring(6, 8), 10), // day
        );
        dateObj.setDate(dateObj.getDate() + 1);
        endDateForCalculation =
          dateObj.getFullYear().toString() +
          (dateObj.getMonth() + 1).toString().padStart(2, "0") +
          dateObj.getDate().toString().padStart(2, "0");
      }

      const endHourString = endHour.toString().padStart(2, "0");
      const endTimeString = endHourString + startTimeMinutes;
      dates += `/${endDateForCalculation}T${endTimeString}00`;
    }
  }

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&location=${location}&dates=${dates}`;
};
