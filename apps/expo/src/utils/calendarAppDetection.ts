import { Linking } from "react-native";
import { Temporal } from "@js-temporal/polyfill";

export type CalendarApp = "google" | "apple" | "system";

export interface CalendarAppInfo {
  id: CalendarApp;
  name: string;
  urlScheme: string;
  isInstalled: boolean;
}

export const isAppInstalled = async (urlScheme: string): Promise<boolean> => {
  try {
    return await Linking.canOpenURL(urlScheme);
  } catch (error) {
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

  const detectionPromises = calendarApps.map(async (app) => {
    app.isInstalled = await isAppInstalled(app.urlScheme);
    return app;
  });

  await Promise.all(detectionPromises);

  return calendarApps;
};

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
      const startPlain = event.startDate.replace(/-/g, "");
      const endBase = (event.endDate || event.startDate).replace(/-/g, "");
      const endPlain = Temporal.PlainDate.from(
        `${endBase.substring(0, 4)}-${endBase.substring(4, 6)}-${endBase.substring(6, 8)}`,
      ).add({ days: 1 });
      const endExclusive = endPlain.toString().replace(/-/g, "");
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
