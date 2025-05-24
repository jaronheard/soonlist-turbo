import { useState } from "react";
import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { toast } from "sonner-native";

import { useOnboarding } from "~/hooks/useOnboarding";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { logError } from "~/utils/errorLogging";

interface SkipDemoButtonProps {
  className?: string;
  textClassName?: string;
}

export function SkipDemoButton({
  className = "",
  textClassName = "text-sm text-neutral-2",
}: SkipDemoButtonProps) {
  const router = useRouter();
  const { showProPaywallIfNeeded } = useRevenueCat();
  const { completeOnboarding } = useOnboarding();
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      await completeOnboarding();
      await showProPaywallIfNeeded();
      router.push("/feed");
    } catch (error) {
      logError("Failed to skip demo and complete onboarding", error);
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
      className={`py-2 ${className}`}
    >
      <Text className={textClassName}>
        {isLoading ? "Loading..." : "or skip demo"}
      </Text>
    </Pressable>
  );
}
