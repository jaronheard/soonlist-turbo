import React from "react";
import { View } from "react-native";
import { Stack, useRouter } from "expo-router";

import { Onboarding } from "~/components/Onboarding";

export default function OnboardingScreen() {
  const router = useRouter();

  const handleComplete = () => {
    router.back();
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: "How to Use" }} />
      <Onboarding onComplete={handleComplete} />
    </View>
  );
}
