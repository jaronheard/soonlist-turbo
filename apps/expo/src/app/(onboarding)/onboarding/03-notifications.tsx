import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Bell } from "~/components/icons";
import { QuestionContainer } from "~/components/QuestionContainer";
import { useOnboarding } from "~/hooks/useOnboarding";
import { useOneSignal } from "~/providers/OneSignalProvider";
import { usePendingFollowUsername } from "~/store";
import { logError } from "~/utils/errorLogging";
import { hapticLight, toast } from "~/utils/feedback";

export default function NotificationsScreen() {
  const {
    registerForPushNotifications,
    hasNotificationPermission,
    isPermissionResolved,
  } = useOneSignal();
  const { saveStep } = useOnboarding();
  const pendingFollowUsername = usePendingFollowUsername();
  const [isLoading, setIsLoading] = useState(false);

  const totalSteps = pendingFollowUsername ? 7 : 6;
  const currentStep = pendingFollowUsername ? 4 : 3;

  const handleNotificationPermission = async () => {
    if (isLoading) return;
    void hapticLight();

    if (hasNotificationPermission) {
      saveStep(
        "notifications",
        { notificationsEnabled: true },
        "/(onboarding)/onboarding/04-paywall",
      );
      return;
    }

    setIsLoading(true);

    try {
      const isPermissionGranted = await registerForPushNotifications();

      saveStep(
        "notifications",
        {
          notificationsEnabled: isPermissionGranted,
        },
        "/(onboarding)/onboarding/04-paywall",
      );
    } catch (error) {
      logError("Failed to save notifications", error);
      toast.error("Something went wrong", "Please try again");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotNow = () => {
    if (isLoading) return;
    void hapticLight();
    saveStep(
      "notifications",
      { notificationsEnabled: false },
      "/(onboarding)/onboarding/04-paywall",
    );
  };

  return (
    <QuestionContainer
      question="Stay in the loop"
      subtitle="Know when events are saved and lists are updated"
      currentStep={currentStep}
      totalSteps={totalSteps}
    >
      <View className="flex-1 justify-between">
        <View className="flex-1 items-center justify-center px-2">
          <Bell color="#FFFFFF" size={100} strokeWidth={1.5} />
        </View>

        <View>
          <Text className="mb-4 text-center text-sm text-white/70">
            You can always update this later in your settings.
          </Text>
          <Pressable
            onPress={handleNotificationPermission}
            disabled={isLoading}
            className="rounded-full bg-white py-4 active:scale-[0.98] active:bg-neutral-100"
          >
            <Text
              className={`text-center text-lg font-semibold text-interactive-1 ${
                isLoading ? "text-interactive-1/50" : ""
              }`}
            >
              {hasNotificationPermission
                ? "Continue"
                : isLoading
                  ? "Loading…"
                  : "Enable notifications"}
            </Text>
          </Pressable>
          {isPermissionResolved && !hasNotificationPermission && (
            <Pressable
              onPress={handleNotNow}
              disabled={isLoading}
              className="mt-2 py-3"
              hitSlop={12}
            >
              <Text className="text-center text-base text-white/60">
                Not now
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </QuestionContainer>
  );
}
