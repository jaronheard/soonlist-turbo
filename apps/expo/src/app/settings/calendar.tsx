import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Stack } from "expo-router";
import { Check } from "lucide-react-native";
import { toast } from "sonner-native";

import { useCalendar } from "~/hooks/useCalendar";
import { CalendarAppInfo } from "~/utils/calendarAppDetection";

export default function CalendarSettingsScreen() {
  const { 
    calendarApps, 
    preferredCalendarApp, 
    setPreferredCalendarApp, 
    isDetecting 
  } = useCalendar();
  
  const handleSelectCalendarApp = (appId: string) => {
    setPreferredCalendarApp(appId as any);
    toast.success(`Set ${appId} as your preferred calendar app`);
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
        <Text className="text-xl font-bold mb-2">Calendar Preferences</Text>
        <Text className="text-gray-600 mb-4">
          Choose which calendar app to use when adding events to your calendar.
        </Text>
      </View>

      {isDetecting ? (
        <View className="items-center justify-center py-8">
          <ActivityIndicator size="large" color="#5A32FB" />
          <Text className="mt-4 text-gray-600">Detecting installed calendar apps...</Text>
        </View>
      ) : (
        <View className="mb-8">
          <Text className="text-lg font-semibold mb-3">Preferred Calendar App</Text>
          
          {calendarApps.map((app) => (
            <CalendarAppOption
              key={app.id}
              app={app}
              isSelected={preferredCalendarApp === app.id}
              onSelect={handleSelectCalendarApp}
            />
          ))}
          
          <Text className="text-xs text-gray-500 mt-2">
            Note: If your preferred app is not installed, we'll fall back to the system calendar.
          </Text>
        </View>
      )}

      <View className="mb-6">
        <Text className="text-lg font-semibold mb-2">About Calendar Integration</Text>
        <Text className="text-gray-600 mb-2">
          • Google Calendar: Opens the Google Calendar app with pre-filled event details
        </Text>
        <Text className="text-gray-600 mb-2">
          • Apple Calendar: Uses the built-in iOS calendar
        </Text>
        <Text className="text-gray-600">
          • System Calendar: Uses the default calendar dialog on your device
        </Text>
      </View>
    </ScrollView>
  );
}

interface CalendarAppOptionProps {
  app: CalendarAppInfo;
  isSelected: boolean;
  onSelect: (appId: string) => void;
}

function CalendarAppOption({ app, isSelected, onSelect }: CalendarAppOptionProps) {
  return (
    <TouchableOpacity
      className={`flex-row items-center p-4 mb-2 rounded-lg border ${
        isSelected ? "border-purple-500 bg-purple-50" : "border-gray-200"
      } ${!app.isInstalled ? "opacity-50" : ""}`}
      onPress={() => app.isInstalled && onSelect(app.id)}
      disabled={!app.isInstalled}
    >
      <View className="flex-1">
        <Text className="font-semibold text-base">{app.name}</Text>
        {!app.isInstalled && (
          <Text className="text-sm text-gray-500">Not installed</Text>
        )}
      </View>
      
      {isSelected && (
        <Check size={20} color="#5A32FB" />
      )}
    </TouchableOpacity>
  );
}

