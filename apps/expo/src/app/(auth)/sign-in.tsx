import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";

import { useAppStore } from "~/store";
import SignInWithOAuth from "../../components/SignInWithOAuth";

export default function AuthScreen() {
  const { isSignedIn } = useAuth();
  const hasCompletedOnboarding = useAppStore(
    (state) => state.hasCompletedOnboarding,
  );

  if (isSignedIn && hasCompletedOnboarding) {
    return <Redirect href="/feed" />;
  }
  if (isSignedIn && !hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return <SignInWithOAuth />;
}
