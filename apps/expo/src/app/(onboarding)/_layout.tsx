import { Stack } from "expo-router";

export const TOTAL_ONBOARDING_STEPS = 7;

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "ios_from_right",
      }}
    ></Stack>
  );
}
