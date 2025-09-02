import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";

import { useAppStore } from "~/store";
import { shouldMockPaywall } from "~/utils/deviceInfo";

export default function PaywallReminderScreen() {
  const { setOnboardingData } = useAppStore();
  const [showMockPaywall] = useState(shouldMockPaywall());
  const posthog = usePostHog();

  const handleSubscribe = async () => {
    if (showMockPaywall) {
      // Mock subscription for simulator
      try {
        posthog.capture("subscription_purchase_success", { from: "reminder_mock" });
      } catch {/* no-op */}
      setOnboardingData({
        subscribed: true,
        trialMode: false,
        subscribedAt: new Date().toISOString(),
      });

      // Go to main feed
      router.replace("/(tabs)/feed");
      return;
    }

    try {
      try {
        posthog.capture("paywall_presented", { from: "reminder" });
      } catch {/* no-op */}
      const paywallResult = await RevenueCatUI.presentPaywall();

      if (
        paywallResult === PAYWALL_RESULT.PURCHASED ||
        paywallResult === PAYWALL_RESULT.RESTORED
      ) {
        // User subscribed successfully
        try {
          posthog.capture("subscription_purchase_success", { from: "reminder" });
        } catch {/* no-op */}
        setOnboardingData({
          subscribed: true,
          trialMode: false,
          subscribedAt: new Date().toISOString(),
        });

        // Go to main feed
        router.replace("/(tabs)/feed");
      }
    } catch (error) {
      console.error("Error presenting paywall:", error);
    }
  };

  const handleContinueTrial = () => {
    // Set trial mode state
    try {
      posthog.capture("trial_started", { reason: "reminder_continue" });
    } catch {/* no-op */}
    setOnboardingData({
      subscribed: false,
      trialMode: true,
    });

    // Continue with trial limitations
    router.replace("/(tabs)/feed");
  };

  return (
    <SafeAreaView className="flex-1 bg-interactive-1">
      <ScrollView className="flex-1 px-6">
        <View className="py-8">
          <Text className="mb-2 text-center text-3xl font-bold text-white">
            You're in trial mode
          </Text>
          <Text className="mb-8 text-center text-lg text-white/80">
            Save up to 3 events to try Soonlist
          </Text>

          {showMockPaywall && (
            <Text className="mb-4 text-center text-sm text-accent-yellow">
              (Mock Mode - Simulator)
            </Text>
          )}

          {/* Trial Limitations */}
          <View className="mb-8 rounded-2xl bg-white/10 p-6">
            <Text className="mb-4 text-center text-xl font-semibold text-white">
              Trial includes:
            </Text>
            <View className="space-y-2">
              <Text className="text-white">✓ Save up to 3 events</Text>
              <Text className="text-white">✓ Basic event details</Text>
              <Text className="text-white">✓ Screenshot capture</Text>
            </View>

            <Text className="mb-4 mt-6 text-center text-xl font-semibold text-white">
              Upgrade to unlock:
            </Text>
            <View className="space-y-2">
              <Text className="text-white/60">• Unlimited event saves</Text>
              <Text className="text-white/60">• Event reminders</Text>
              <Text className="text-white/60">• Share with friends</Text>
              <Text className="text-white/60">• Advanced discovery</Text>
              <Text className="text-white/60">• Priority support</Text>
            </View>
          </View>

          {/* Visual indicator of 3 event limit */}
          <View className="mb-8 flex-row justify-center space-x-2">
            {[1, 2, 3].map((num) => (
              <View
                key={num}
                className="h-16 w-16 items-center justify-center rounded-full bg-white/20"
              >
                <Text className="text-2xl font-bold text-white">{num}</Text>
              </View>
            ))}
          </View>

          {/* Upgrade Button */}
          <Pressable
            onPress={handleSubscribe}
            className="mb-4 rounded-full bg-accent-yellow py-4"
          >
            <Text className="text-center text-lg font-semibold text-black">
              Upgrade to Unlimited
            </Text>
          </Pressable>

          {/* Continue with Trial */}
          <Pressable onPress={handleContinueTrial} className="py-2">
            <Text className="text-center text-white/80 underline">
              Continue with 3-event trial
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
