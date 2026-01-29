import type { FunctionReturnType } from "convex/server";
import { useEffect, useRef, useState } from "react";
import { ActionSheetIOS, Linking, Platform } from "react-native";
import * as Calendar from "expo-calendar";
import { Temporal } from "@js-temporal/polyfill";

import type { api } from "@soonlist/backend/convex/_generated/api";
import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { CalendarAppInfo } from "~/utils/calendarAppDetection";
import { usePreferredCalendarApp, useSetPreferredCalendarApp } from "~/store";
import {
  createGoogleCalendarLink,
  detectCalendarApps,
} from "~/utils/calendarAppDetection";
import Config from "~/utils/config";
import { logError } from "~/utils/errorLogging";
import { hapticSuccess, toast } from "~/utils/feedback";

export function useCalendar() {
  const preferredCalendarApp = usePreferredCalendarApp();
  const setPreferredCalendarApp = useSetPreferredCalendarApp();
  const [calendarApps, setCalendarApps] = useState<CalendarAppInfo[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const hasDetectedRef = useRef(false);

  // Detect installed calendar apps
  useEffect(() => {
    if (hasDetectedRef.current) return;
    hasDetectedRef.current = true;

    let isActive = true;

    const detectApps = async () => {
      setIsDetecting(true);
      try {
        const apps = await detectCalendarApps();
        if (!isActive) return;
        setCalendarApps(apps);
      } catch (error) {
        logError(
          "Error detecting calendar apps",
          error instanceof Error ? error : new Error(String(error)),
        );
      } finally {
        if (isActive) setIsDetecting(false);
      }
    };

    void detectApps();

    return () => {
      isActive = false;
    };
  }, [preferredCalendarApp, setPreferredCalendarApp]);

  const handleAddToCal = async (
    event: NonNullable<FunctionReturnType<typeof api.events.get>>,
  ) => {
    try {
      // Ensure we have detected apps at least once
      const apps =
        calendarApps.length > 0 ? calendarApps : await detectCalendarApps();

      // First-use selection: if no preference is set, decide or ask the user
      let currentPreferred = preferredCalendarApp;
      if (!currentPreferred) {
        const googleInstalled =
          apps.find((a) => a.id === "google")?.isInstalled === true;
        // On iOS, Apple Calendar is effectively always available via the system UI
        const appleInstalled =
          apps.find((a) => a.id === "apple")?.isInstalled === true ||
          Platform.OS === "ios";

        if (googleInstalled && appleInstalled && Platform.OS === "ios") {
          // Ask the user which app to use
          const choice = await new Promise<"apple" | "google" | "cancel">(
            (resolve) => {
              ActionSheetIOS.showActionSheetWithOptions(
                {
                  title: "Choose calendar app",
                  options: ["Cancel", "Apple Calendar", "Google Calendar"],
                  cancelButtonIndex: 0,
                  userInterfaceStyle: "light",
                },
                (buttonIndex) => {
                  if (buttonIndex === 1) resolve("apple");
                  else if (buttonIndex === 2) resolve("google");
                  else resolve("cancel");
                },
              );
            },
          );

          if (choice === "cancel") return;
          setPreferredCalendarApp(choice);
          currentPreferred = choice;
        } else if (googleInstalled) {
          setPreferredCalendarApp("google");
          currentPreferred = "google";
        } else {
          // Default to Apple on iOS
          setPreferredCalendarApp("apple");
          currentPreferred = "apple";
        }
      }

      // The event.event comes from Convex and should match our expected interface

      const calendarEvent = event.event as AddToCalendarButtonPropsRestricted;

      // Build enriched description (used for Google Calendar as well)
      const baseUrlForDesc = Config.apiBaseUrl;
      const eventUrlForDesc =
        event.userName && event.id && baseUrlForDesc
          ? `${baseUrlForDesc}/event/${event.id}`
          : baseUrlForDesc;
      const displayNameForDesc =
        event.user?.displayName || (event.userName ? `@${event.userName}` : "");
      const additionalTextForDesc =
        event.userName && event.id && baseUrlForDesc
          ? `Captured by ${displayNameForDesc} on Soonlist. \nFull details: ${eventUrlForDesc}`
          : baseUrlForDesc
            ? `Captured on Soonlist\n(${baseUrlForDesc})`
            : "Captured on Soonlist";
      const fullDescriptionForGoogle = `${calendarEvent.description}\n\n${additionalTextForDesc}`;

      // If Google Calendar is preferred and installed, use it
      if (currentPreferred === "google") {
        const sourceApps = calendarApps.length > 0 ? calendarApps : apps;
        const googleInstalled =
          sourceApps.find((app) => app.id === "google")?.isInstalled === true;
        if (googleInstalled) {
          const googleCalendarUrl = createGoogleCalendarLink({
            name: calendarEvent.name,
            description: fullDescriptionForGoogle,
            location: calendarEvent.location,
            startDate: calendarEvent.startDate,
            startTime: calendarEvent.startTime,
            endDate: calendarEvent.endDate,
            endTime: calendarEvent.endTime,
            timeZone: calendarEvent.timeZone,
          });

          const canOpen = await Linking.canOpenURL(googleCalendarUrl);
          if (canOpen) {
            await Linking.openURL(googleCalendarUrl);
            void hapticSuccess();
            return;
          } else {
            // Fall back to system calendar if Google Calendar URL can't be opened
            toast.warning(
              "Couldn't open Google Calendar, using Apple Calendar",
            );
            setPreferredCalendarApp("apple");
            currentPreferred = "apple";
          }
        } else {
          // Google Calendar was preferred but is no longer installed
          toast.warning("Google Calendar not installed, using Apple Calendar");
          setPreferredCalendarApp("apple");
          currentPreferred = "apple";
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
          toast.error("Calendar permission required", "Enable in Settings");
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
          logError(
            "Error parsing date",
            error instanceof Error ? error : new Error(String(error)),
            {
              dateString,
              timeString,
              timezone,
            },
          );
          throw new Error("Invalid date or time format");
        }
      };

      const eventTimezone = calendarEvent.timeZone || Temporal.Now.timeZoneId();

      let startDate: Date;
      let endDate: Date;

      if (calendarEvent.startDate && calendarEvent.startTime) {
        startDate = parseDate(
          calendarEvent.startDate,
          calendarEvent.startTime,
          eventTimezone,
        );
      } else if (calendarEvent.startDate) {
        startDate = parseDate(calendarEvent.startDate, "00:00", eventTimezone);
      } else {
        throw new Error("Start date is required");
      }

      if (calendarEvent.endDate && calendarEvent.endTime) {
        endDate = parseDate(
          calendarEvent.endDate,
          calendarEvent.endTime,
          eventTimezone,
        );
      } else if (calendarEvent.endDate) {
        endDate = parseDate(calendarEvent.endDate, "23:59", eventTimezone);
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

      const fullDescription = `${calendarEvent.description}\n\n${additionalText}`;

      const eventDetails = {
        title: calendarEvent.name,
        startDate,
        endDate,
        location: calendarEvent.location,
        notes: fullDescription,
        timeZone: eventTimezone,
        url: eventUrl, // iOS only, but included for platforms that support it
      };

      const result = await Calendar.createEventInCalendarAsync(eventDetails);

      if (result.action !== Calendar.CalendarDialogResultActions.canceled) {
        void hapticSuccess();
      }
    } catch (error) {
      logError(
        "Error adding event to calendar",
        error instanceof Error ? error : new Error(String(error)),
      );
      toast.error("Failed to add to calendar", "Please try again");
    }
  };

  return {
    handleAddToCal,
    calendarApps,
    preferredCalendarApp,
    setPreferredCalendarApp,
    isDetecting,
  } as const;
}
