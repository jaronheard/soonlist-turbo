import { Alert, Platform } from "react-native";
import * as Calendar from "expo-calendar";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import { useAppStore } from "~/store";
import { showToast } from "~/utils/toast";

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
    clearCalendarData, // Add this line
  } = useAppStore();

  const handleAddToCal = async (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
  ) => {
    console.log("handleAddToCal called with event:", event);
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      console.log("Calendar permission status:", status);
      if (status !== Calendar.PermissionStatus.GRANTED) {
        Alert.alert(
          "Permission Required",
          "Calendar permission is required to add events.",
        );
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(
        Calendar.EntityTypes.EVENT,
      );
      console.log("Fetched calendars:", calendars);

      let defaultCalendar: Calendar.Calendar | null = null;
      if (Platform.OS === "ios") {
        defaultCalendar = await Calendar.getDefaultCalendarAsync();
        console.log("Default iOS calendar:", defaultCalendar);
      }

      calendars.sort((a, b) => {
        const usageA = calendarUsage[a.id] || 0;
        const usageB = calendarUsage[b.id] || 0;

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
      console.log("Sorted calendars:", calendars);

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
    console.log("handleCalendarSelect called with id:", selectedCalendarId);
    setIsCalendarModalVisible(false);

    if (!selectedEvent) {
      console.error("No event selected");
      return;
    }

    try {
      setDefaultCalendarId(selectedCalendarId);

      const e = selectedEvent.event as AddToCalendarButtonPropsRestricted;
      console.log("Selected event:", e);

      // Parse dates correctly
      const parseDate = (dateString: string, timeString: string) => {
        const [year, month, day] = dateString.split("-").map(Number);
        const [hours, minutes] = timeString.split(":").map(Number);
        return new Date(year, month - 1, day, hours, minutes);
      };

      const startDate = parseDate(e.startDate, e.startTime || "00:00");
      let endDate: Date;

      if (e.endDate && e.endTime) {
        endDate = parseDate(e.endDate, e.endTime);
      } else if (e.endDate) {
        endDate = parseDate(e.endDate, "23:59");
      } else {
        // If no end date is provided, set it to 1 hour after start time
        endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      }

      console.log("Parsed startDate:", startDate);
      console.log("Parsed endDate:", endDate);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error("Invalid date parsed");
      }

      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
      console.log("Base URL:", baseUrl);

      const additionalText =
        selectedEvent.userName && selectedEvent.id
          ? `Collected by @${selectedEvent.userName} on Soonlist. \nFull details: ${baseUrl}/event/${selectedEvent.id}`
          : `Collected on Soonlist\n(${baseUrl})`;

      const fullDescription = `${e.description}\n\n${additionalText}`;
      console.log("Full description:", fullDescription);

      const eventDetails = {
        title: e.name,
        startDate,
        endDate,
        location: e.location,
        notes: fullDescription,
        timeZone: e.timeZone,
      };
      console.log("Event details to be added:", eventDetails);

      const eventId = await Calendar.createEventAsync(
        selectedCalendarId,
        eventDetails,
      );
      console.log("Created event with ID:", eventId);

      if (eventId) {
        showToast("Event successfully added to calendar", "success");
      }

      const newUsage = { ...calendarUsage };
      newUsage[selectedCalendarId] = (newUsage[selectedCalendarId] || 0) + 1;
      setCalendarUsage(newUsage);
      console.log("Updated calendar usage:", newUsage);
    } catch (error) {
      console.error("Error adding event to calendar:", error);
      showToast("Failed to add event to calendar. Please try again.", "error");
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
    clearCalendarData, // Add this line
  };
}
