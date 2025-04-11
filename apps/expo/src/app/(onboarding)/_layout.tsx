import { View } from "react-native";
import { Stack } from "expo-router";

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
    </View>
  );
}
