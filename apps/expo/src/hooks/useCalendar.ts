import type { FunctionReturnType } from "convex/server";
import { Linking } from "react-native";
import * as Calendar from "expo-calendar";
import { Temporal } from "@js-temporal/polyfill";
import { toast } from "sonner-native";

import type { api } from "@soonlist/backend/convex/_generated/api";
import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import Config from "~/utils/config";
import { logError } from "~/utils/errorLogging";

export function useCalendar() {
  const handleAddToCal = async (
    event: NonNullable<FunctionReturnType<typeof api.events.get>>,
  ) => {
    try {
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

      const e = event.event as AddToCalendarButtonPropsRestricted;

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

      const additionalText =
        event.userName && event.id
          ? `Collected by @${event.userName} on Soonlist. \nFull details: ${baseUrl}/event/${event.id}`
          : `Collected on Soonlist\n(${baseUrl})`;

      const fullDescription = `${e.description}\n\n${additionalText}`;

      const eventDetails = {
        title: e.name,
        startDate,
        endDate,
        location: e.location,
        notes: fullDescription,
        timeZone: eventTimezone,
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
  };
}
