import React from "react";
import { View } from "react-native";
import { Stack, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { Onboarding } from "~/components/Onboarding";
import { getKeyChainAccessGroup } from "~/utils/getKeyChainAccessGroup";

export default function OnboardingScreen() {
  const router = useRouter();

  const handleComplete = async () => {
    await SecureStore.setItemAsync("hasCompletedOnboarding", "true", {
      keychainAccessGroup: getKeyChainAccessGroup(),
    });
    router.push("/feed");
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{ title: "How to Use", headerBackTitle: "Back" }}
      />
      <Onboarding onComplete={handleComplete} />
    </View>
  );
}
