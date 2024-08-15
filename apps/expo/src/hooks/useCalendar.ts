import { useEffect, useState } from "react";
import { Alert } from "react-native";
import * as Calendar from "expo-calendar";
import * as SecureStore from "expo-secure-store";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";

export function useCalendar() {
  const [defaultCalendarId, setDefaultCalendarId] = useState<string | null>(
    null,
  );
  const [isCalendarModalVisible, setIsCalendarModalVisible] = useState(false);
  const [availableCalendars, setAvailableCalendars] = useState<
    Calendar.Calendar[]
  >([]);

  const [selectedEvent, setSelectedEvent] = useState<
    RouterOutputs["event"]["getUpcomingForUser"][number] | null
  >(null);

  useEffect(() => {
    const loadDefaultCalendar = async () => {
      try {
        const savedCalendarId = await SecureStore.getItemAsync(
          "defaultCalendarId",
          {
            keychainAccessible: SecureStore.WHEN_UNLOCKED,
            keychainAccessGroup: "group.soonlist.soonlist",
          },
        );
        if (savedCalendarId) {
          setDefaultCalendarId(savedCalendarId);
        }
      } catch (error) {
        console.error("Error loading default calendar:", error);
      }
    };
    void loadDefaultCalendar();
  }, []);

  const handleAddToCal = async (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
  ) => {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
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

      // Sort calendars, putting the default calendar first
      calendars.sort((a, b) => {
        if (a.id === defaultCalendarId) return -1;
        if (b.id === defaultCalendarId) return 1;
        return 0;
      });

      setAvailableCalendars(calendars);
      setSelectedEvent(event);
      setIsCalendarModalVisible(true);
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
      // Save the selected calendar as default using SecureStore
      await SecureStore.setItemAsync("defaultCalendarId", selectedCalendarId, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
        keychainAccessGroup: "group.soonlist.soonlist",
      });
      setDefaultCalendarId(selectedCalendarId);

      const e = selectedEvent.event as AddToCalendarButtonPropsRestricted;
      const startDate = new Date(`${e.startDate}T${e.startTime || "00:00"}:00`);
      const endDate = e.endTime
        ? new Date(`${e.startDate}T${e.endTime}:00`)
        : new Date(startDate.getTime() + 60 * 60 * 1000); // Default to 1 hour if no end time

      const eventId = await Calendar.createEventAsync(selectedCalendarId, {
        title: e.name,
        startDate,
        endDate,
        location: e.location,
        notes: e.description,
        timeZone: e.timeZone,
      });

      if (eventId) {
        const selectedCalendar = availableCalendars.find(
          (cal) => cal.id === selectedCalendarId,
        );
        Alert.alert(
          "Success",
          `Event "${e.name}" added to calendar: ${selectedCalendar?.title} (${selectedCalendar?.source.name})`,
        );
      }
    } catch (error) {
      console.error("Error adding event to calendar:", error);
      Alert.alert(
        "Error",
        "Failed to add event to calendar. Please try again.",
      );
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
  };
}
