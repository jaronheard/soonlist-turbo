import { useState } from "react";
import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { toast } from "sonner-native";

import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore } from "~/store";

export function FinishDemoButton() {
  const router = useRouter();
  const { showProPaywallIfNeeded } = useRevenueCat();
  const setHasCompletedOnboarding = useAppStore(
    (state) => state.setHasCompletedOnboarding,
  );
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      setHasCompletedOnboarding(true);
      await showProPaywallIfNeeded();
      // Navigate to feed after paywall is handled
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
    <Pressable
      onPress={handlePress}
      disabled={isLoading}
      className={`m-4 mb-8 rounded-full ${isLoading ? "bg-interactive-1/50" : "bg-interactive-1"} px-6 py-3`}
    >
      <Text className="text-center text-lg font-bold text-white">
        {isLoading ? "Loading..." : "Finish demo"}
      </Text>
    </Pressable>
  );
}
