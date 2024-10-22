import React from "react";
import { View } from "react-native";
import { Stack } from "expo-router";

import { StoryOnboarding } from "~/components/StoryOnboarding";

export default function OnboardingScreen() {
  return (
    <>
      <Stack.Screen
        options={{ headerShown: false, navigationBarHidden: false }}
      />
      <View className="flex-1">
        <StoryOnboarding />
      </View>
    </>
  );
}
