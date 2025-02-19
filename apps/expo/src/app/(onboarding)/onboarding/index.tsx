import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

import { useAppStore } from "~/store";
import { api } from "~/utils/api";

export default function OnboardingIndex() {
  const { hasCompletedOnboarding, setHasCompletedOnboarding } = useAppStore();
  const { user: clerkUser, isLoaded } = useUser();
  const searchParams = useLocalSearchParams();

  // Get user data from our database
  const { data: user, isLoading: isLoadingUser } = api.user.getById.useQuery(
    { id: clerkUser?.id ?? "" },
    { enabled: !!clerkUser?.id },
  );

  // Use useEffect to handle state updates
  useEffect(() => {
    if (user?.onboardingCompletedAt || hasCompletedOnboarding) {
      setHasCompletedOnboarding(true);
    }
  }, [
    user?.onboardingCompletedAt,
    hasCompletedOnboarding,
    setHasCompletedOnboarding,
  ]);

  // If we're still loading, show a spinner
  if (!isLoaded || isLoadingUser) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (searchParams.demo) {
    return <Redirect href="/onboarding/demo-intro" />;
  }

  // If they've completed onboarding before (either in DB or local state), go to feed
  if (user?.onboardingCompletedAt || hasCompletedOnboarding) {
    return <Redirect href="/feed" />;
  }

  // Otherwise, start from the beginning
  return <Redirect href="/onboarding/01-notifications" />;
}
