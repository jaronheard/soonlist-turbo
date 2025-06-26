import React from "react";
import { Redirect } from "expo-router";
import { useConvexAuth } from "convex/react";

import { useAppStore } from "~/store";
import SignInWithOAuth from "../../components/SignInWithOAuth";

export default function AuthScreen() {
  const { isAuthenticated } = useConvexAuth();
  const hasCompletedOnboarding = useAppStore(
    (state) => state.hasCompletedOnboarding,
  );
  const hasSeenOnboarding = useAppStore((state) => state.hasSeenOnboarding);

  if (isAuthenticated && hasCompletedOnboarding) {
    return <Redirect href="/feed" />;
  }
  if (isAuthenticated && !hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  // If user hasn't seen onboarding, redirect them there
  if (!hasSeenOnboarding) {
    return <Redirect href="/(onboarding)/onboarding" />;
  }

  // Otherwise show the sign-in screen (they came from paywall)
  return <SignInWithOAuth />;
}
