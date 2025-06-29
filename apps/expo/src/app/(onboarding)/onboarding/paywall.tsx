import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore } from "~/store";
import { shouldMockPaywall } from "~/utils/deviceInfo";

export default function PaywallScreen() {
  const { isInitialized } = useRevenueCat();
  const { setOnboardingData } = useAppStore();
  const [showMockPaywall] = useState(shouldMockPaywall());

  const presentPaywall = useCallback(async () => {
    try {
      const paywallResult = await RevenueCatUI.presentPaywall();

      switch (paywallResult) {
        case PAYWALL_RESULT.PURCHASED:
        case PAYWALL_RESULT.RESTORED:
          // User subscribed successfully
          setOnboardingData({
            subscribed: true,
            subscribedAt: new Date().toISOString(),
          });
          // Mark onboarding as seen
          useAppStore.getState().setHasSeenOnboarding(true);
          // Navigate to sign-in screen with subscription status
          router.push({
            pathname: "/sign-in",
            params: { fromPaywall: "true", subscribed: "true" },
          });
          break;

        case PAYWALL_RESULT.CANCELLED:
        case PAYWALL_RESULT.ERROR:
          // User cancelled or error occurred - enter trial mode
          setOnboardingData({
            subscribed: false,
            trialMode: true,
            trialStartedAt: new Date().toISOString(),
          });
          // Mark onboarding as seen
          useAppStore.getState().setHasSeenOnboarding(true);
          // Navigate to sign-in screen in trial mode
          router.push({
            pathname: "/sign-in",
            params: { fromPaywall: "true", trial: "true" },
          });
          break;
      }
    } catch (error) {
      console.error("Error presenting paywall:", error);
      // On error, continue to sign-up in trial mode
      setOnboardingData({
        subscribed: false,
        trialMode: true,
        trialStartedAt: new Date().toISOString(),
      });
      // Mark onboarding as seen
      useAppStore.getState().setHasSeenOnboarding(true);
      router.push({
        pathname: "/sign-in",
        params: { fromPaywall: "true", trial: "true" },
      });
    }
  }, [setOnboardingData]);

  useEffect(() => {
    if (!showMockPaywall && isInitialized) {
      void presentPaywall();
    }
  }, [isInitialized, showMockPaywall, presentPaywall]);

  const handleSkip = () => {
    // Dismiss the paywall and enter trial mode
    if (!showMockPaywall) {
      // Paywall will dismiss automatically
    }

    // Save that they're in trial mode
    setOnboardingData({
      subscribed: false,
      trialMode: true,
      trialStartedAt: new Date().toISOString(),
    });

    // Mark onboarding as seen
    useAppStore.getState().setHasSeenOnboarding(true);

    // Navigate to sign-in screen
    router.push({
      pathname: "/sign-in",
      params: { fromPaywall: "true", trial: "true" },
    });
  };

  const handleMockSubscribe = (plan: string) => {
    // Mock subscription for simulator
    setOnboardingData({
      subscribed: true,
      subscribedAt: new Date().toISOString(),
      subscriptionPlan: plan,
    });
    // Mark onboarding as seen
    useAppStore.getState().setHasSeenOnboarding(true);
    // Navigate to sign-in screen
    router.push({
      pathname: "/sign-in",
      params: { fromPaywall: "true", subscribed: "true", plan },
    });
  };

  // Show mock paywall UI in simulator/development
  if (showMockPaywall) {
    return (
      <SafeAreaView className="flex-1 bg-interactive-1">
        <ScrollView className="flex-1 px-6">
          <View className="py-8">
            <Text className="mb-2 text-center text-3xl font-bold text-white">
              Unlock Soonlist
            </Text>
            <Text className="mb-2 text-center text-lg text-white/80">
              Save unlimited events and never miss out
            </Text>
            <Text className="mb-8 text-center text-sm text-accent-yellow">
              (Mock Paywall - Simulator Mode)
            </Text>

            {/* Mock Plans */}
            <View className="mb-8 space-y-4">
              <Pressable
                onPress={() => handleMockSubscribe("monthly")}
                className="rounded-2xl border-2 border-white/30 bg-white/5 p-4"
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-lg font-semibold text-white">
                      Monthly
                    </Text>
                    <Text className="text-white/80">Cancel anytime</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-2xl font-bold text-white">$9.99</Text>
                    <Text className="text-sm text-white/60">/month</Text>
                  </View>
                </View>
              </Pressable>

              <Pressable
                onPress={() => handleMockSubscribe("yearly")}
                className="rounded-2xl border-2 border-white bg-white/10 p-4"
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-lg font-semibold text-white">
                      Yearly
                    </Text>
                    <Text className="text-white/80">Save 50% - Best value</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-2xl font-bold text-white">
                      $59.99
                    </Text>
                    <Text className="text-sm text-white/60">/year</Text>
                  </View>
                </View>
                <View className="mt-2 self-start rounded-full bg-accent-yellow px-3 py-1">
                  <Text className="text-sm font-semibold text-black">
                    BEST VALUE
                  </Text>
                </View>
              </Pressable>
            </View>

            <Text className="mb-4 text-center text-white/60">
              Tap a plan to simulate purchase
            </Text>

            {/* Try Free Button */}
            <Pressable onPress={handleSkip} className="py-2">
              <Text className="text-center text-white/80 underline">
                Try 3 events free
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-interactive-1">
      <View className="flex-1 items-center justify-center px-6">
        {!isInitialized ? (
          <>
            <ActivityIndicator size="large" color="white" />
            <Text className="mt-4 text-white">Loading...</Text>
          </>
        ) : (
          <>
            <Text className="mb-4 text-center text-xl text-white">
              Opening subscription options...
            </Text>
            <Pressable onPress={handleSkip} className="mt-8 py-2">
              <Text className="text-center text-white/80 underline">
                Skip and try 3 events free
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
