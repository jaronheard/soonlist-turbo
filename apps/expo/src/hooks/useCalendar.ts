import type { FunctionReturnType } from "convex/server";
import { Linking, Platform } from "react-native";
import * as Calendar from "expo-calendar";
import { Temporal } from "@js-temporal/polyfill";
import { toast } from "sonner-native";
import { useEffect, useState } from "react";

import type { api } from "@soonlist/backend/convex/_generated/api";
import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import Config from "~/utils/config";
import { logError } from "~/utils/errorLogging";
import { 
  CalendarApp, 
  CalendarAppInfo, 
  createGoogleCalendarLink, 
  detectCalendarApps 
} from "~/utils/calendarAppDetection";
import { usePreferredCalendarApp, useSetPreferredCalendarApp } from "~/store";

export function useCalendar() {
  const preferredCalendarApp = usePreferredCalendarApp();
  const setPreferredCalendarApp = useSetPreferredCalendarApp();
  const [calendarApps, setCalendarApps] = useState<CalendarAppInfo[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);

  // Detect installed calendar apps
  useEffect(() => {
    const detectApps = async () => {
      if (isDetecting) return;
      
      setIsDetecting(true);
      try {
        const apps = await detectCalendarApps();
        setCalendarApps(apps);
        
        // If no preferred app is set and Google Calendar is installed, set it as preferred
        if (!preferredCalendarApp) {
          const googleApp = apps.find(app => app.id === "google" && app.isInstalled);
          if (googleApp) {
            setPreferredCalendarApp("google");
          } else {
            // Default to system calendar if Google Calendar is not installed
            setPreferredCalendarApp("system");
          }
        }
      } catch (error) {
        logError("Error detecting calendar apps", error);
      } finally {
        setIsDetecting(false);
      }
    };
    
    void detectApps();
  }, [preferredCalendarApp, setPreferredCalendarApp, isDetecting]);

  const handleAddToCal = async (
    event: NonNullable<FunctionReturnType<typeof api.events.get>>,
  ) => {
    try {
      const e = event.event as AddToCalendarButtonPropsRestricted;
      
      // If Google Calendar is preferred and installed, use it
      if (preferredCalendarApp === "google") {
        const googleApp = calendarApps.find(app => app.id === "google");
        if (googleApp?.isInstalled) {
          const googleCalendarUrl = createGoogleCalendarLink({
            name: e.name,
            description: e.description,
            location: e.location,
            startDate: e.startDate,
            startTime: e.startTime,
            endDate: e.endDate,
            endTime: e.endTime,
          });
          
          const canOpen = await Linking.canOpenURL(googleCalendarUrl);
          if (canOpen) {
            await Linking.openURL(googleCalendarUrl);
            toast.success("Opening Google Calendar");
            return;
          } else {
            // Fall back to system calendar if Google Calendar URL can't be opened
            toast.error("Couldn't open Google Calendar, falling back to system calendar");
            setPreferredCalendarApp("system");
          }
        } else {
          // Google Calendar was preferred but is no longer installed
          toast.error("Google Calendar is not installed, falling back to system calendar");
          setPreferredCalendarApp("system");
        }
      }
      
      // Check if we need calendar permissions
      // iOS 17+ doesn't require permissions when using the system calendar UI
      const needsPermissionCheck =
        Platform.OS === "android" ||
        (Platform.OS === "ios" && Number(Platform.Version.split(".")[0]) < 17);

      if (needsPermissionCheck) {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        if (status !== Calendar.PermissionStatus.GRANTED) {
          toast.error("Calendar permission required", {
            action: {
              label: "Settings",
              onClick: () => {
                void Linking.openSettings();
              },
            },
          });
          return;
        }
      }

      const parseDate = (
        dateString: string,
        timeString: string,
        timezone: string,
      ): Date => {
        try {
          const eventDateTime = Temporal.ZonedDateTime.from(
            `${dateString}T${timeString || "00:00:00"}[${timezone}]`,
          );
          return new Date(eventDateTime.epochMilliseconds);
        } catch (error) {
          logError("Error parsing date", error, {
            dateString,
            timeString,
            timezone,
          });
          throw new Error("Invalid date or time format");
        }
      };

      const eventTimezone = e.timeZone || Temporal.Now.timeZoneId();

      let startDate: Date;
      let endDate: Date;

      if (e.startDate && e.startTime) {
        startDate = parseDate(e.startDate, e.startTime, eventTimezone);
      } else if (e.startDate) {
        startDate = parseDate(e.startDate, "00:00", eventTimezone);
      } else {
        throw new Error("Start date is required");
      }

      if (e.endDate && e.endTime) {
        endDate = parseDate(e.endDate, e.endTime, eventTimezone);
      } else if (e.endDate) {
        endDate = parseDate(e.endDate, "23:59", eventTimezone);
      } else {
        endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      }

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error("Invalid date parsed");
      }

      const baseUrl = Config.apiBaseUrl;
      if (!baseUrl) {
        throw new Error("EXPO_PUBLIC_API_BASE_URL is not defined");
      }

      const eventUrl =
        event.userName && event.id ? `${baseUrl}/event/${event.id}` : baseUrl;

      const displayName =
        event.user?.displayName || (event.userName ? `@${event.userName}` : "");
      const additionalText =
        event.userName && event.id
          ? `Captured by ${displayName} on Soonlist. \nFull details: ${eventUrl}`
          : `Captured on Soonlist\n(${baseUrl})`;

      const fullDescription = `${e.description}\n\n${additionalText}`;

      const eventDetails = {
        title: e.name,
        startDate,
        endDate,
        location: e.location,
        notes: fullDescription,
        timeZone: eventTimezone,
        url: eventUrl, // iOS only, but included for platforms that support it
      };

      const result = await Calendar.createEventInCalendarAsync(eventDetails);

      if (result.action !== Calendar.CalendarDialogResultActions.canceled) {
        toast.success("Event successfully added to calendar");
      }
    } catch (error) {
      logError("Error adding event to calendar", error);
      toast.error("Failed to add event to calendar. Please try again.");
    }
  };

  return {
    handleAddToCal,
    calendarApps,
    preferredCalendarApp,
    setPreferredCalendarApp,
    isDetecting,
  };
}
