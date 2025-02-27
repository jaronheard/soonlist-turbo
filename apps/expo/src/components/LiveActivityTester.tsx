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
  setupOneSignalLiveActivity,
  startOneSignalLiveActivity,
  updateOneSignalLiveActivity,
} from "../utils/oneSignalLiveActivity";

export function LiveActivityTester() {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [title, setTitle] = useState<string>("Test Event");
  const [headline, setHeadline] = useState<string>("Event happening now");
  const [activityId, setActivityId] = useState<string>(
    "test_activity_" + Date.now(),
  );
  const [activityActive, setActivityActive] = useState<boolean>(false);
  const activityType = "capture"; // Set fixed activity type to "capture"

  // Check if device supports Live Activities
  useEffect(() => {
    if (Platform.OS === "ios") {
      try {
        // Check if Live Activities are supported
        const enabled = Platform.constants.osVersion >= "16.1";
        setIsSupported(true);
        setIsEnabled(enabled);

        // Setup OneSignal Live Activities
        if (enabled) {
          setupOneSignalLiveActivity();
        }
      } catch (error) {
        console.error("Error checking Live Activities support:", error);
        setIsSupported(false);
      }
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

      // Start with OneSignal
      const attributes = {
        title: title,
        activityType: activityType,
      };
      const content = { message: { en: headline } };

      const success = startOneSignalLiveActivity(
        activityId,
        attributes,
        content,
      );

      if (success) {
        setActivityActive(true);
        Alert.alert("Success", "OneSignal Live Activity started");
      } else {
        Alert.alert("Error", "Failed to start OneSignal Live Activity");
      }
    } catch (error) {
      console.error("Failed to start Live Activity:", error);
      Alert.alert("Error", "Failed to start Live Activity");
    }
  };

  const handleUpdateActivity = () => {
    try {
      if (!activityActive) {
        Alert.alert(
          "No Activity",
          "There is no active Live Activity to update",
        );
        return;
      }

      // Update with OneSignal
      const content = { message: { en: headline } };

      const success = updateOneSignalLiveActivity(activityId, content);

      if (success) {
        Alert.alert("Success", "OneSignal Live Activity updated");
      } else {
        Alert.alert("Error", "Failed to update OneSignal Live Activity");
      }
    } catch (error) {
      console.error("Failed to update Live Activity:", error);
      Alert.alert("Error", "Failed to update Live Activity");
    }
  };

  const handleEndActivity = () => {
    try {
      if (!activityActive) {
        Alert.alert("No Activity", "There is no active Live Activity to end");
        return;
      }

      Alert.alert(
        "OneSignal Note",
        "Currently, ending OneSignal Live Activities directly from the app is not supported in the OneSignal API. Activities will automatically end based on their configured lifetime.",
      );

      setActivityActive(false);
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
        `Live Activities Enabled: ${isEnabled ? "Yes" : "No"}\n` +
        `Activity Type: ${activityType}\n\n` +
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
          Test Live Activity (Capture)
        </Text>
        <TouchableOpacity onPress={showSupportInfo} className="p-1">
          <Info size={18} color="#4B5563" />
        </TouchableOpacity>
      </View>

      {!isEnabled && (
        <View className="mb-3 rounded-md bg-amber-100 p-2">
          <Text className="text-xs text-amber-800">
            Live Activities are disabled or not properly configured. Check app
            entitlements and iOS version (16.1+ required).
          </Text>
        </View>
      )}

      <View className="mb-3">
        <Text className="mb-1 text-xs font-medium text-neutral-2">
          Activity ID
        </Text>
        <TextInput
          value={activityId}
          onChangeText={setActivityId}
          className="mb-2 rounded-md bg-white p-2 text-sm"
          placeholder="Unique activity identifier"
        />

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
      </View>

      <View className="flex-row justify-center space-x-3">
        <TouchableOpacity
          onPress={handleStartActivity}
          disabled={activityActive || !isEnabled}
          className={`items-center rounded-lg bg-blue-500 p-2 ${
            activityActive || !isEnabled ? "opacity-50" : ""
          }`}
        >
          <ActivitySquare size={20} color="#ffffff" />
          <Text className="mt-1 text-xs text-white">Start</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleUpdateActivity}
          disabled={!activityActive || !isEnabled}
          className={`items-center rounded-lg bg-green-500 p-2 ${
            !activityActive || !isEnabled ? "opacity-50" : ""
          }`}
        >
          <ActivitySquare size={20} color="#ffffff" />
          <Text className="mt-1 text-xs text-white">Update</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleEndActivity}
          disabled={!activityActive || !isEnabled}
          className={`items-center rounded-lg bg-red-500 p-2 ${
            !activityActive || !isEnabled ? "opacity-50" : ""
          }`}
        >
          <Square size={20} color="#ffffff" />
          <Text className="mt-1 text-xs text-white">End</Text>
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
