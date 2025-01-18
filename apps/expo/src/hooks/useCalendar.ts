import { Alert, Linking, Platform } from "react-native";
import * as Calendar from "expo-calendar";
import { Temporal } from "@js-temporal/polyfill";
import { toast } from "sonner-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import { useAppStore } from "~/store";
import Config from "~/utils/config";

const INITIAL_CALENDAR_LIMIT = 5;

export function useCalendar() {
  const {
    defaultCalendarId,
    isCalendarModalVisible,
    availableCalendars,
    selectedEvent,
    showAllCalendars,
    calendarUsage,
    setDefaultCalendarId,
    setIsCalendarModalVisible,
    setAvailableCalendars,
    setSelectedEvent,
    setShowAllCalendars,
    setCalendarUsage,
    clearCalendarData,
  } = useAppStore();

  const handleAddToCal = async (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
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

      const calendars = await Calendar.getCalendarsAsync(
        Calendar.EntityTypes.EVENT,
      );

      let defaultCalendar: Calendar.Calendar | null = null;
      if (Platform.OS === "ios") {
        defaultCalendar = await Calendar.getDefaultCalendarAsync();
      }

      calendars.sort((a, b) => {
        const usageA = calendarUsage[a.id] ?? 0;
        const usageB = calendarUsage[b.id] ?? 0;

        if (usageA === 0 && usageB === 0) {
          if (a.id === defaultCalendarId) return -1;
          if (b.id === defaultCalendarId) return 1;
          if (a.id === defaultCalendar?.id) return -1;
          if (b.id === defaultCalendar?.id) return 1;
        } else {
          if (usageA !== usageB) return usageB - usageA;
          if (a.id === defaultCalendarId) return -1;
          if (b.id === defaultCalendarId) return 1;
        }
        return 0;
      });

      setAvailableCalendars(calendars);
      setSelectedEvent(event);
      setIsCalendarModalVisible(true);
      setShowAllCalendars(false);
    } catch (error) {
      console.error("Error fetching calendars:", error);
      Alert.alert("Error", "Failed to fetch calendars. Please try again.");
    }
  };

  const handleCalendarSelect = async (selectedCalendarId: string) => {
    setIsCalendarModalVisible(false);

    if (!selectedEvent) {
      console.error("No event selected");
      return;
    }

    try {
      setDefaultCalendarId(selectedCalendarId);

      const e = selectedEvent.event as AddToCalendarButtonPropsRestricted;

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
          console.error("Error parsing date:", error);
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
        selectedEvent.userName && selectedEvent.id
          ? `Collected by @${selectedEvent.userName} on Soonlist. \nFull details: ${baseUrl}/event/${selectedEvent.id}`
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

      const eventId = await Calendar.createEventAsync(
        selectedCalendarId,
        eventDetails,
      );

      if (eventId) {
        toast.success("Event successfully added to calendar");
      }

      const newUsage = { ...calendarUsage };
      newUsage[selectedCalendarId] = (newUsage[selectedCalendarId] ?? 0) + 1;
      setCalendarUsage(newUsage);
    } catch (error) {
      console.error("Error adding event to calendar:", error);
      toast.error("Failed to add event to calendar. Please try again.");
    } finally {
      setSelectedEvent(null);
    }
  };

  return {
    isCalendarModalVisible,
    setIsCalendarModalVisible,
    availableCalendars,
    handleAddToCal,
    handleCalendarSelect,
    showAllCalendars,
    setShowAllCalendars,
    INITIAL_CALENDAR_LIMIT,
    clearCalendarData,
  };
}
