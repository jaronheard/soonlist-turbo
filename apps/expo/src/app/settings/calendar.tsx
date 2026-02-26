import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack } from "expo-router";

import type { CalendarAppInfo } from "~/utils/calendarAppDetection";
import { Check } from "~/components/icons";
import { useCalendar } from "~/hooks/useCalendar";
import { hapticSuccess } from "~/utils/feedback";

export default function CalendarSettingsScreen() {
  const {
    calendarApps,
    preferredCalendarApp,
    setPreferredCalendarApp,
    isDetecting,
  } = useCalendar();

  const handleSelectCalendarApp = (appId: string) => {
    // Type guard to ensure the appId is valid
    if (appId === "google" || appId === "apple") {
      setPreferredCalendarApp(appId);
      void hapticSuccess();
    } else {
      console.error("Invalid calendar app ID:", appId);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white px-4 py-6">
      <Stack.Screen
        options={{
          title: "Calendar Settings",
          headerBackTitle: "Settings",
        }}
      />

      <View className="mb-6">
        <Text className="mb-2 text-xl font-bold">Calendar Preferences</Text>
        <Text className="mb-4 text-gray-600">
          Choose which calendar app to use when adding events to your calendar.
        </Text>
      </View>

      {isDetecting ? (
        <View className="items-center justify-center py-8">
          <ActivityIndicator size="large" color="#5A32FB" />
          <Text className="mt-4 text-gray-600">
            Detecting installed calendar apps...
          </Text>
        </View>
      ) : (
        <View className="mb-8">
          <Text className="mb-3 text-lg font-semibold">
            Preferred Calendar App
          </Text>

          {calendarApps
            .filter((app) => app.id !== "system")
            .map((app) => (
              <CalendarAppOption
                key={app.id}
                app={app}
                isSelected={preferredCalendarApp === app.id}
                onSelect={handleSelectCalendarApp}
              />
            ))}

          <Text className="mt-2 text-xs text-gray-500">
            Note: If your preferred app is not installed, we'll use Apple
            Calendar.
          </Text>
        </View>
      )}

      <View className="mb-6">
        <Text className="mb-2 text-lg font-semibold">
          About Calendar Integration
        </Text>
        <Text className="mb-2 text-gray-600">
          • Google Calendar: Opens the Google Calendar app with pre-filled event
          details
        </Text>
        <Text className="mb-2 text-gray-600">
          • Apple Calendar: Uses the built-in iOS calendar
        </Text>
        {/* iOS only; system calendar option is not shown separately */}
      </View>
    </ScrollView>
  );
}

interface CalendarAppOptionProps {
  app: CalendarAppInfo;
  isSelected: boolean;
  onSelect: (appId: string) => void;
}

function CalendarAppOption({
  app,
  isSelected,
  onSelect,
}: CalendarAppOptionProps) {
  return (
    <TouchableOpacity
      className={`mb-2 flex-row items-center rounded-lg border p-4 ${
        isSelected ? "border-purple-500 bg-purple-50" : "border-gray-200"
      } ${!app.isInstalled ? "opacity-50" : ""}`}
      onPress={() => app.isInstalled && onSelect(app.id)}
      disabled={!app.isInstalled}
    >
      <View className="flex-1">
        <Text className="text-base font-semibold">{app.name}</Text>
        {!app.isInstalled && (
          <Text className="text-sm text-gray-500">Not installed</Text>
        )}
      </View>

      {isSelected && <Check size={20} color="#5A32FB" />}
    </TouchableOpacity>
  );
}
