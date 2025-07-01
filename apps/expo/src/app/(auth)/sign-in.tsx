import React from "react";
import { Text, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useConvexAuth } from "convex/react";

import { useAppStore } from "~/store";
import SignInWithOAuth from "../../components/SignInWithOAuth";

export default function AuthScreen() {
  const { isAuthenticated } = useConvexAuth();
  const { fromPaywall, subscribed, trial, plan } = useLocalSearchParams<{
    fromPaywall?: string;
    subscribed?: string;
    trial?: string;
    plan?: string;
  }>();
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

  // Show sign-in screen with status banners if coming from paywall
  const showBanner = fromPaywall === "true";

  // Create the banner component
  const banner = showBanner ? (
    <View className="px-4 pb-4 pt-4">
      {subscribed === "true" && (
        <View className="rounded-2xl bg-interactive-2 px-6 py-4">
          <Text className="text-center text-lg font-bold text-neutral-1">
            Thanks for subscribing! 🎉
          </Text>
          <Text className="text-center text-base text-neutral-1">
            Create your account to get started
          </Text>
          {plan && (
            <Text className="mt-1 text-center text-sm text-neutral-1/80">
              {plan === "monthly" ? "Monthly plan" : "Yearly plan"}
            </Text>
          )}
        </View>
      )}

      {trial === "true" && (
        <View className="rounded-2xl bg-interactive-2 px-6 py-4">
          <Text className="text-center text-lg font-bold text-neutral-1">
            Try saving 3 events for free
          </Text>
          <Text className="text-center text-base text-neutral-1">
            Create your account to get started
          </Text>
        </View>
      )}
    </View>
  ) : null;

  return <SignInWithOAuth banner={banner} />;
}
