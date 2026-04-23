import React from "react";
import { Text, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useConvexAuth } from "convex/react";

import { FollowContextBanner } from "~/components/FollowContextBanner";
import { useAppStore, usePendingFollowUsername } from "~/store";
import SignInWithOAuth from "../../components/SignInWithOAuth";

export default function AuthScreen() {
  const { isAuthenticated } = useConvexAuth();
  const { fromPaywall, subscribed, plan } = useLocalSearchParams<{
    fromPaywall?: string;
    subscribed?: string;
    trial?: string;
    plan?: string;
  }>();
  const hasCompletedOnboarding = useAppStore(
    (state) => state.hasCompletedOnboarding,
  );
  const hasSeenOnboarding = useAppStore((state) => state.hasSeenOnboarding);
  const pendingFollowUsername = usePendingFollowUsername();

  if (isAuthenticated && hasCompletedOnboarding) {
    return <Redirect href="/feed" />;
  }
  if (isAuthenticated && !hasCompletedOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  if (!hasSeenOnboarding) {
    return <Redirect href="/(onboarding)/onboarding" />;
  }

  const showBanner = fromPaywall === "true";

  const showFollowBanner = !!pendingFollowUsername;
  const banner =
    showBanner || showFollowBanner ? (
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

        {showFollowBanner && <FollowContextBanner />}
      </View>
    ) : null;

  return <SignInWithOAuth banner={banner} />;
}

export { ErrorBoundary } from "expo-router";
