import { Redirect } from "expo-router";

import { useAppStore } from "~/store";

export default function OnboardingIndex() {
  const { hasCompletedOnboarding } = useAppStore();

  // If they've completed onboarding before, skip directly to demo
  if (hasCompletedOnboarding) {
    return <Redirect href="/onboarding/demo-intro" />;
  }

  // Otherwise, start from the beginning
  return <Redirect href="/onboarding/01-notifications" />;
}
