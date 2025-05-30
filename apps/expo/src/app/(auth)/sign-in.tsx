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

  if (isAuthenticated && hasCompletedOnboarding) {
    return <Redirect href="/feed" />;
  }
  if (isAuthenticated && !hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return <SignInWithOAuth />;
}
