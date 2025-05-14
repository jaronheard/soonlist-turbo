import { useState } from "react";
import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { toast } from "sonner-native";

import { useOnboarding } from "~/hooks/useOnboarding";

interface FinishDemoButtonProps {
  text?: string;
  variant?: "dark" | "light";
}

export function FinishDemoButton({
  text = "Finish demo",
  variant = "dark",
}: FinishDemoButtonProps) {
  const router = useRouter();
  const { completeOnboarding } = useOnboarding();
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      await completeOnboarding();
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

  const buttonStyles =
    variant === "dark"
      ? `${isLoading ? "bg-interactive-1/50" : "bg-interactive-1"}`
      : `${isLoading ? "bg-white/50" : "bg-white"}`;

  const textStyles = variant === "dark" ? "text-white" : "text-interactive-1";

  return (
    <Pressable
      onPress={handlePress}
      disabled={isLoading}
      className={`m-4 mb-8 rounded-full ${buttonStyles} px-6 py-3`}
    >
      <Text className={`text-center text-lg font-bold ${textStyles}`}>
        {isLoading ? "Loading..." : text}
      </Text>
    </Pressable>
  );
}
