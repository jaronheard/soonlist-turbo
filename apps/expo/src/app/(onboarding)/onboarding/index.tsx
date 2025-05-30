import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useConvexAuth, useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

export default function OnboardingIndex() {
  const { user: clerkUser } = useUser();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();

  // Get user data from our database using Convex
  const user = useQuery(
    api.users.getById,
    clerkUser?.id ? { id: clerkUser.id } : "skip",
  );

  // Following Convex + Clerk pattern: combine authentication state with user existence check
  // Show loading if auth is loading OR if we're authenticated but user data is still loading
  const isLoading =
    authLoading || (isAuthenticated && clerkUser?.id && user === undefined);

  // Show loading spinner while authentication is loading or user data is being fetched
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // If not authenticated, redirect to sign-up
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/sign-up" />;
  }

  // If authenticated but user is null (not stored in database yet), redirect to sign-up
  if (isAuthenticated && user === null) {
    return <Redirect href="/(auth)/sign-up" />;
  }

  // At this point, user should be defined
  if (!user) {
    return <Redirect href="/(auth)/sign-up" />;
  }

  if (user.onboardingCompletedAt) {
    return <Redirect href="/feed" />;
  }

  // Otherwise, start from the beginning
  return <Redirect href="/onboarding/01-notifications" />;
}
