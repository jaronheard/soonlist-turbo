import React from "react";
import { ScrollView, View } from "react-native";
import { Stack } from "expo-router";

import { Onboarding } from "~/components/Onboarding";
import { useAuthRedirect } from "~/hooks/useAuthRedirect";
import { useAppStore } from "~/store";

export default function OnboardingScreen() {
  const { checkOnboardingStatus } = useAuthRedirect();
  const setHasCompletedOnboarding = useAppStore(
    (state) => state.setHasCompletedOnboarding,
  );

  // Add this function to handle onboarding completion
  const handleOnboardingComplete = () => {
    setHasCompletedOnboarding(true);
    checkOnboardingStatus();
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{ title: "How to Use", headerBackVisible: false }}
      />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Onboarding onComplete={handleOnboardingComplete} />
      </ScrollView>
    </View>
  );
}
