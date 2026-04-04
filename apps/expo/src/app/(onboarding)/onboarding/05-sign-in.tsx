import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { FollowContextBanner } from "~/components/FollowContextBanner";
import OnboardingOrbit from "~/components/OnboardingOrbit";
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

  // Progress continues from the earlier onboarding screens. Sign-in sits at
  // totalSteps - 1 so the bar reads "almost done" — the final tick fills in
  // once the account is created.
  const totalSteps = pendingFollowUsername ? 7 : 6;
  const currentStep = totalSteps - 1;

  return (
    <SignInWithOAuth
      banner={banner}
      headline="Start your Soonlist"
      subtitle="Sign up to capture every event in one place"
      imageSlot={<OrbitStage />}
      dark
      progress={{ current: currentStep, total: totalSteps }}
    />
  );
}

// Visual nudge: shrinking the stage from the bottom makes the orbit sit
// higher relative to the sign-in buttons below. The orbit auto-centers in
// its own box, so a bottom-only margin ≈ 2× the desired upward shift.
const ORBIT_BOTTOM_OFFSET = 72; // ≈ 36px visual upward shift

function OrbitStage() {
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  return (
    <View
      style={{ flex: 1, marginBottom: ORBIT_BOTTOM_OFFSET }}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize((prev) =>
          prev?.width === width && prev.height === height
            ? prev
            : { width, height },
        );
      }}
    >
      {size ? (
        <OnboardingOrbit width={size.width} height={size.height} />
      ) : null}
    </View>
  );
}

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";
