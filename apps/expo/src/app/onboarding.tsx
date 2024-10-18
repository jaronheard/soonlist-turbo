import React from "react";
import { View } from "react-native";
import { Stack } from "expo-router";

import { StoryOnboarding } from "~/components/StoryOnboarding";

export default function OnboardingScreen() {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{ title: "Welcome to Soonlist", headerBackVisible: false }}
      />
      <StoryOnboarding />
    </View>
  );
}
