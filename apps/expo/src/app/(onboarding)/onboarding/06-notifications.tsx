import React, { useState } from "react";
import { Alert, Text, View } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

import { Button } from "~/components/Button";
import { QuestionContainer } from "~/components/QuestionContainer";
import { useNotification } from "~/providers/NotificationProvider";

export default function NotificationsScreen() {
  const [showRealPrompt, setShowRealPrompt] = useState(false);
  const { registerForPushNotifications } = useNotification();

  const handleNotificationPermission = async () => {
    if (showRealPrompt) {
      await registerForPushNotifications();
      const { status } = await Notifications.getPermissionsAsync();

      if (status !== Notifications.PermissionStatus.GRANTED) {
        Alert.alert(
          "Permission required",
          "Please enable notifications in your device settings to get the most out of Soonlist.",
        );
      }

      router.push("/onboarding/07-photos");
    } else {
      setShowRealPrompt(true);
    }
  };

  return (
    <QuestionContainer
      question="Enable Notifications"
      currentStep={6}
      totalSteps={7}
    >
      <View className="flex-1 items-center justify-center px-4">
        <View className="w-full max-w-sm rounded-lg bg-gray-100 p-4 shadow-sm">
          <Text className="mb-2 text-base font-medium">
            "Soonlist" Would Like to Send You Notifications
          </Text>
          <Text className="mb-4 text-sm text-gray-600">
            We'll notify you when it's time to capture events you want to check
            out, so you never miss an opportunity.
          </Text>
          <View className="flex-row justify-end space-x-4">
            <Button
              variant="ghost"
              onPress={() => handleNotificationPermission()}
              className="flex-1"
            >
              Allow
            </Button>
          </View>
        </View>
      </View>
    </QuestionContainer>
  );
}
