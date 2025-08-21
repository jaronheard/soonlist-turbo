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
    console.error("Error checking if app is installed:", error);
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
    {
      id: "system",
      name: "System Calendar",
      urlScheme: "calshow://", // Same as Apple Calendar
      isInstalled: true, // Always available as fallback
    },
  ];

  // Check which apps are installed
  for (let i = 0; i < calendarApps.length; i++) {
    if (calendarApps[i].id !== "system") {
      // System calendar is always available
      calendarApps[i].isInstalled = await isAppInstalled(
        calendarApps[i].urlScheme,
      );
    }
  }

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
      dates += `/${startDate}T${
        event.startTime 
          ? (parseInt(event.startTime.split(":")[0]) + 1).toString().padStart(2, "0") + event.startTime.substring(2)
          : "010000"
      }`;
    }
  }
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&location=${location}&dates=${dates}`;
};

