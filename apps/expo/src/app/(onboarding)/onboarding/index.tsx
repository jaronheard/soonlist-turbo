import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useConvexAuth, useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { useAppStore } from "~/store";

export default function OnboardingIndex() {
  const { user: clerkUser } = useUser();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const hasSeenOnboarding = useAppStore((state) => state.hasSeenOnboarding);

  // Get user data from our database using Convex (only for authenticated users)
  const user = useQuery(
    api.users.getById,
    clerkUser?.id ? { id: clerkUser.id } : "skip",
  );

  // Show loading only if we're checking authentication
  if (authLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // If user has already seen onboarding (guest or authenticated)
  if (hasSeenOnboarding) {
    // If authenticated, go to feed
    if (isAuthenticated && user) {
      return <Redirect href="/(tabs)/feed" />;
    }
    // If not authenticated, go to sign-in
    return <Redirect href="/(auth)/sign-in" />;
  }

  // New users (guest or authenticated) start onboarding
  // Start from the welcome screen (to be created)
  return <Redirect href="/(onboarding)/onboarding/01-notifications" />;
}