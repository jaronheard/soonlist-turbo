import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivitySquare, Info, Square } from "lucide-react-native";

import {
  areActivitiesEnabled,
  endActivity,
  startActivity,
} from "../../modules/live-activity-control";

export function LiveActivityTester() {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("Test Event");
  const [headline, setHeadline] = useState<string>("Event happening now");
  const [widgetUrl, setWidgetUrl] = useState<string>(
    "https://soonlist.com/events/test/widget",
  );
  const [activityActive, setActivityActive] = useState<boolean>(false);

  // Check if device supports Live Activities
  useEffect(() => {
    if (Platform.OS === "ios") {
      const enabled = areActivitiesEnabled();
      setIsSupported(true);
      setIsEnabled(enabled);
    } else {
      setIsSupported(false);
    }
  }, []);

  const handleStartActivity = () => {
    try {
      if (!isEnabled) {
        Alert.alert(
          "Not Supported",
          "Live Activities are not enabled on this device.",
        );
        return;
      }

      // Calculate start and end times
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour from now

      // Directly call the module function with the correct parameters
      const success = startActivity({
        startTime,
        endTime,
        title,
        headline,
        widgetUrl,
      });

      if (success) {
        setActivityActive(true);
        Alert.alert("Success", "Live Activity started successfully");
      } else {
        Alert.alert("Error", "Failed to start Live Activity");
      }
    } catch (error) {
      console.error("Failed to start Live Activity:", error);
      Alert.alert("Error", "Failed to start Live Activity");
    }
  };

  const handleEndActivity = () => {
    try {
      if (!activityActive) {
        Alert.alert("No Activity", "There is no active Live Activity to end");
        return;
      }

      // Directly call the module function with the correct parameters
      endActivity({
        title,
        headline: "Event has ended",
        widgetUrl,
      });

      setActivityActive(false);
      Alert.alert("Success", "Live Activity ended successfully");
    } catch (error) {
      console.error("Failed to end Live Activity:", error);
      Alert.alert("Error", "Failed to end Live Activity");
    }
  };

  const showSupportInfo = () => {
    Alert.alert(
      "Live Activities Support",
      `Platform: ${Platform.OS}\n` +
        `iOS Version: ${Platform.Version}\n` +
        `Supports Live Activities: ${isSupported ? "Yes" : "No"}\n` +
        `Live Activities Enabled: ${isEnabled ? "Yes" : "No"}\n\n` +
        "Live Activities require iOS 16.1 or later and proper entitlements.",
    );
  };

  if (Platform.OS !== "ios") {
    return (
      <View className="mb-4 mt-2 rounded-lg bg-blue-100 p-4">
        <Text className="text-center text-base text-neutral-1">
          Live Activities are only supported on iOS
        </Text>
      </View>
    );
  }

  return (
    <View className="mb-4 mt-2 rounded-lg bg-blue-100 p-4">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-base font-bold text-neutral-1">
          Test Live Activity
        </Text>
        <TouchableOpacity onPress={showSupportInfo} className="p-1">
          <Info size={18} color="#4B5563" />
        </TouchableOpacity>
      </View>

      {!isEnabled && (
        <View className="mb-3 rounded-md bg-amber-100 p-2">
          <Text className="text-xs text-amber-800">
            Live Activities are disabled or not properly configured. Check app
            entitlements.
          </Text>
        </View>
      )}

      <View className="mb-3">
        <Text className="mb-1 text-xs font-medium text-neutral-2">Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          className="mb-2 rounded-md bg-white p-2 text-sm"
          placeholder="Event title"
        />

        <Text className="mb-1 text-xs font-medium text-neutral-2">
          Headline
        </Text>
        <TextInput
          value={headline}
          onChangeText={setHeadline}
          className="mb-2 rounded-md bg-white p-2 text-sm"
          placeholder="Event headline"
        />

        <Text className="mb-1 text-xs font-medium text-neutral-2">
          Widget URL
        </Text>
        <TextInput
          value={widgetUrl}
          onChangeText={setWidgetUrl}
          className="rounded-md bg-white p-2 text-sm"
          placeholder="https://example.com/widget"
        />
      </View>

      <View className="flex-row justify-center space-x-4">
        <TouchableOpacity
          onPress={handleStartActivity}
          disabled={activityActive || !isEnabled}
          className={`items-center rounded-lg bg-blue-500 p-2 ${
            activityActive || !isEnabled ? "opacity-50" : ""
          }`}
        >
          <ActivitySquare size={24} color="#ffffff" />
          <Text className="mt-1 text-xs text-white">Start Activity</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleEndActivity}
          disabled={!activityActive || !isEnabled}
          className={`items-center rounded-lg bg-red-500 p-2 ${
            !activityActive || !isEnabled ? "opacity-50" : ""
          }`}
        >
          <Square size={24} color="#ffffff" />
          <Text className="mt-1 text-xs text-white">End Activity</Text>
        </TouchableOpacity>
      </View>

      <View className="mt-3">
        <Text className="text-center text-xs text-neutral-2">
          Status: {activityActive ? "Active" : "Inactive"}
        </Text>
      </View>
    </View>
  );
}
