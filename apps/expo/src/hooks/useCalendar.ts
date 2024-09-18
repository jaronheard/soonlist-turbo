import { useEffect } from "react";
import { Alert, Platform } from "react-native";
import * as Calendar from "expo-calendar";
import * as SecureStore from "expo-secure-store";

import type { RouterOutputs } from "~/utils/api";
import { useAppStore } from "~/store";
import { getKeyChainAccessGroup } from "~/utils/getKeyChainAccessGroup";
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
  } = useAppStore();

  useEffect(() => {
    const loadDefaultCalendar = async () => {
      try {
        const savedCalendarId = await SecureStore.getItemAsync(
          "defaultCalendarId",
          {
            keychainAccessible: SecureStore.WHEN_UNLOCKED,
            keychainAccessGroup: getKeyChainAccessGroup(),
          },
        );
        if (savedCalendarId) {
          setDefaultCalendarId(savedCalendarId);
        }

        const usageData = await SecureStore.getItemAsync("calendarUsage", {
          keychainAccessible: SecureStore.WHEN_UNLOCKED,
          keychainAccessGroup: getKeyChainAccessGroup(),
        });
        if (usageData) {
          const parsedUsage = JSON.parse(usageData) as Record<string, number>;
          setCalendarUsage(parsedUsage);
        }
      } catch (error) {
        console.error("Error loading calendar data:", error);
      }
    };
    void loadDefaultCalendar();
  }, [setDefaultCalendarId, setCalendarUsage]);

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

      let defaultCalendar: Calendar.Calendar | null = null;
      if (Platform.OS === "ios") {
        defaultCalendar = await Calendar.getDefaultCalendarAsync();
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
      await SecureStore.setItemAsync("defaultCalendarId", selectedCalendarId, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
        keychainAccessGroup: getKeyChainAccessGroup(),
      });
      setDefaultCalendarId(selectedCalendarId);

      const e = selectedEvent.event as AddToCalendarButtonPropsRestricted;
      const startDate = new Date(`${e.startDate}T${e.startTime || "00:00"}:00`);
      const endDate = e.endTime
        ? new Date(`${e.startDate}T${e.endTime}:00`)
        : new Date(startDate.getTime() + 60 * 60 * 1000);

      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
      const additionalText =
        selectedEvent.userName && selectedEvent.id
          ? `Collected by @${selectedEvent.userName} on Soonlist. \nFull details: ${baseUrl}/event/${selectedEvent.id}`
          : `Collected on Soonlist\n(${baseUrl})`;

      const fullDescription = `${e.description}\n\n${additionalText}`;

      const eventId = await Calendar.createEventAsync(selectedCalendarId, {
        title: e.name,
        startDate,
        endDate,
        location: e.location,
        notes: fullDescription,
        timeZone: e.timeZone,
      });

      if (eventId) {
        showToast("Event successfully added to calendar", "success");
      }

      const newUsage = { ...calendarUsage };
      newUsage[selectedCalendarId] = (newUsage[selectedCalendarId] || 0) + 1;
      setCalendarUsage(newUsage);
      await SecureStore.setItemAsync(
        "calendarUsage",
        JSON.stringify(newUsage),
        {
          keychainAccessible: SecureStore.WHEN_UNLOCKED,
          keychainAccessGroup: getKeyChainAccessGroup(),
        },
      );
    } catch (error) {
      console.error("Error adding event to calendar:", error);
      showToast("Failed to add event to calendar. Please try again.", "error");
    } finally {
      setSelectedEvent(null);
    }
  };

  const clearCalendarData = async () => {
    try {
      await SecureStore.deleteItemAsync("defaultCalendarId", {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
        keychainAccessGroup: getKeyChainAccessGroup(),
      });
      await SecureStore.deleteItemAsync("calendarUsage", {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
        keychainAccessGroup: getKeyChainAccessGroup(),
      });
      setDefaultCalendarId(null);
      setCalendarUsage({});
    } catch (error) {
      console.error("Error clearing calendar data:", error);
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
