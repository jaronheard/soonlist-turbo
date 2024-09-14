import React from "react";
import { ScrollView, View } from "react-native";
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
        options={{ title: "How to Use", headerBackVisible: false }}
      />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Onboarding onComplete={handleComplete} />
      </ScrollView>
    </View>
  );
}
