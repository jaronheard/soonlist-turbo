import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";

import { useRevenueCat } from "~/providers/RevenueCatProvider";

export function FinishDemoButton() {
  const router = useRouter();
  const { showProPaywallIfNeeded } = useRevenueCat();

  const handlePress = async () => {
    await showProPaywallIfNeeded();
    // Navigate to feed after paywall is handled
    router.push("/feed");
  };

  return (
    <Pressable
      onPress={handlePress}
      className="m-4 mb-8 rounded-full bg-interactive-1 px-6 py-3"
    >
      <Text className="text-center text-lg font-bold text-white">
        Finish Demo
      </Text>
    </Pressable>
  );
}
