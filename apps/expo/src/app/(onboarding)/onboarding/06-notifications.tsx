import React, { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

import { QuestionContainer } from "~/components/QuestionContainer";
import { useNotification } from "~/providers/NotificationProvider";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

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
      totalSteps={TOTAL_ONBOARDING_STEPS}
    >
      <View className="flex-1 items-center justify-center px-4">
        <View className="h-min overflow-hidden rounded-2xl bg-white">
          <View className="px-2 pb-3 pt-4">
            <Text className="mb-2 px-8 text-center text-xl font-medium leading-7">
              Turn on Push Notifications to capture and remember events.
            </Text>
            <Text className="mb-2 px-8 text-center text-base leading-5 text-[#3c3c43]/60">
              Soonlist notifies you when events are created, and to help you
              build a habit of capturing events.
            </Text>
          </View>
          <View className="flex-row border-t border-[#3c3c43]/30">
            <Pressable className="w-1/2 py-3" disabled>
              <Text className="text-center text-lg font-medium text-[#007AFF] opacity-30">
                Don't Allow
              </Text>
            </Pressable>
            <Pressable
              className="w-1/2 border-l border-[#3c3c43]/30 py-3"
              onPress={handleNotificationPermission}
            >
              <Text className="text-center text-lg font-bold text-[#007AFF]">
                Allow
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </QuestionContainer>
  );
}
