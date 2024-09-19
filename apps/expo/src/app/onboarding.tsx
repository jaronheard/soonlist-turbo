import React from "react";
import { ScrollView, View } from "react-native";
import { Stack, useRouter } from "expo-router";

import { Onboarding } from "~/components/Onboarding";
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
        options={{ title: "How to Use", headerBackVisible: false }}
      />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Onboarding onComplete={handleOnboardingComplete} />
      </ScrollView>
    </View>
  );
}
