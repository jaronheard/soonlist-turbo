import React from "react";
import { View } from "react-native";
import { Stack, useRouter } from "expo-router";

import { StoryOnboarding } from "~/components/StoryOnboarding";
import { useAppStore } from "~/store";

export default function OnboardingScreen() {
  const router = useRouter();
  const setHasCompletedOnboarding = useAppStore(
    (state) => state.setHasCompletedOnboarding,
  );

  const handleOnboardingComplete = () => {
    setHasCompletedOnboarding(true);
    router.replace("/feed");
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{ title: "Welcome to Soonlist", headerBackVisible: false }}
      />
      <StoryOnboarding />
    </View>
  );
}
