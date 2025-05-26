"use client";

import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

export default function OnboardingIndex() {
  const { user: clerkUser, isLoaded } = useUser();

  // Get user data from our database using Convex
  const user = useQuery(
    api.users.getById,
    clerkUser?.id ? { id: clerkUser.id } : "skip",
  );

  // If we're still loading, show a spinner
  if (!isLoaded || !user) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (user.onboardingCompletedAt) {
    return <Redirect href="/feed" />;
  }

  // Otherwise, start from the beginning
  return <Redirect href="/onboarding/01-notifications" />;
}
