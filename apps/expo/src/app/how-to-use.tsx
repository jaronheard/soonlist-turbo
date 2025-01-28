import React from "react";
import { View } from "react-native";
import { Stack } from "expo-router";

import { StoryOnboarding } from "~/components/StoryOnboarding";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore } from "~/store";

export default function OnboardingScreen() {
  const { customerInfo, showProPaywallIfNeeded } = useRevenueCat();
  const setHasCompletedOnboarding = useAppStore(
    (state) => state.setHasCompletedOnboarding,
  );
  const isPro = Boolean(customerInfo?.entitlements.active.pro);

  return (
    <>
      <Stack.Screen
        options={{ headerShown: false, navigationBarHidden: false }}
      />
      <View className="flex-1">
        <StoryOnboarding
          onFinish={async () => {
            setHasCompletedOnboarding(true);
            if (!isPro) {
              await showProPaywallIfNeeded();
            }
          }}
        />
      </View>
    </>
  );
}
