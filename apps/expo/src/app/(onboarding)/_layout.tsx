import { Stack } from "expo-router";
import { View } from "react-native";

import { ResetOnboardingButton } from "~/components/auth/ResetOnboardingButton";

export const TOTAL_ONBOARDING_STEPS = 10;

export default function OnboardingLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "ios_from_right",
        }}
      />
      <View style={{ position: "absolute", bottom: 16, width: "100%", alignItems: "center" }}>
        <ResetOnboardingButton />
      </View>
    </View>
  );
}

