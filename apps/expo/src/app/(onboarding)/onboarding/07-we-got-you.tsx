import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { toast } from "sonner-native";

import { DemoProgressBar } from "~/components/DemoProgressBar";
import { useAppStore } from "~/store";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";
import { useOnboarding } from "~/hooks/useOnboarding";
import { useRevenueCat } from "~/providers/RevenueCatProvider";

export default function WeGotYouScreen() {
  const [isLoading, setIsLoading] = React.useState(false);
  const { completeOnboarding } = useOnboarding();
  const { showProPaywallIfNeeded } = useRevenueCat();
  const { onboardingData } = useAppStore();

  // Get the priority text from onboarding data
  const priorityText = onboardingData.priority?.text;

  const handleContinue = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      await completeOnboarding();
      await showProPaywallIfNeeded();
      router.push("/feed");
    } catch (error) {
      toast.error("Something went wrong", {
        description: "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-interactive-3" edges={["top"]}>
      <DemoProgressBar
        currentStep={7}
        totalSteps={TOTAL_ONBOARDING_STEPS}
        variant="light"
      />
      <View className="flex-1 items-center justify-center px-4">
        <View className="mb-8 w-full max-w-md">
          <Text className="mb-4 text-center text-4xl font-bold text-black">
            We got you
          </Text>
          <Text className="text-center text-lg text-neutral-2">
            {priorityText
              ? `We'll help you achieve your goal of "${priorityText}"`
              : "We'll help you keep track of all your possibilities"}
          </Text>
        </View>

        <View className="mb-8 w-full max-w-md items-center">
          <Image
            source={require("../../../../assets/images/onboarding/we-got-you.png")}
            style={{ width: 240, height: 240 }}
            contentFit="contain"
          />
        </View>

        <TouchableOpacity
          onPress={handleContinue}
          disabled={isLoading}
          className={`w-full max-w-md rounded-full ${isLoading ? "bg-interactive-1/50" : "bg-interactive-1"} px-6 py-3`}
        >
          <Text className="text-center text-lg font-bold text-white">
            {isLoading ? "Loading..." : "Continue"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
