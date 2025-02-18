import { Redirect } from "expo-router";

import { useAppStore } from "~/store";
import { api } from "~/utils/api";

export default function OnboardingIndex() {
  const { hasCompletedOnboarding, setHasCompletedOnboarding } = useAppStore();

  // Get onboarding data to check if they've completed onboarding before
  const { data: onboardingData, isLoading } =
    api.user.getOnboardingData.useQuery();

  // If we're still loading, don't redirect yet
  if (isLoading) {
    return null;
  }

  // If they've completed onboarding before (either in DB or local state), go to feed
  if (onboardingData?.completedAt || hasCompletedOnboarding) {
    // Make sure local state is in sync
    setHasCompletedOnboarding(true);
    return <Redirect href="/feed" />;
  }

  // If they've completed onboarding before, skip directly to demo
  if (hasCompletedOnboarding) {
    return <Redirect href="/onboarding/demo-intro" />;
  }

  // Otherwise, start from the beginning
  return <Redirect href="/onboarding/01-notifications" />;
}
