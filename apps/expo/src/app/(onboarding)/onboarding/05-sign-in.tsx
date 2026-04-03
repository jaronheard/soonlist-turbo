import React, { useEffect } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { FollowContextBanner } from "~/components/FollowContextBanner";
import SignInWithOAuth from "~/components/SignInWithOAuth";
import { useAppStore, usePendingFollowUsername } from "~/store";

export default function OnboardingSignInScreen() {
  const { fromPaywall, subscribed, trial, plan } = useLocalSearchParams<{
    fromPaywall?: string;
    subscribed?: string;
    trial?: string;
    plan?: string;
  }>();
  const pendingFollowUsername = usePendingFollowUsername();
  const setHasCompletedOnboarding = useAppStore(
    (state) => state.setHasCompletedOnboarding,
  );

  // Mark onboarding as completed on mount
  // hasSeenOnboarding was already set to true by 04-paywall
  // The layout redirect will handle navigation once the user is authenticated
  useEffect(() => {
    setHasCompletedOnboarding(true);
  }, [setHasCompletedOnboarding]);

  // Show contextual banners based on paywall result
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

  return (
    <SignInWithOAuth
      banner={banner}
      headline="Start your Soonlist"
      subtitle="Sign up to capture every event in one place"
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
      imageSource={require("../../../assets/feed-alternate.png")}
    />
  );
}

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";
