import { View } from "react-native";
import { Redirect, Stack } from "expo-router";
import { useConvexAuth } from "convex/react";

import { useAppStore } from "~/store";

export { ErrorBoundary } from "expo-router";

export default function OnboardingLayout() {
  const { isAuthenticated } = useConvexAuth();
  const hasSeenOnboarding = useAppStore((state) => state.hasSeenOnboarding);
  const pendingFollowUsername = useAppStore(
    (state) => state.pendingFollowUsername,
  );

  if (isAuthenticated && hasSeenOnboarding && !pendingFollowUsername) {
    return <Redirect href="/(tabs)/feed" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "ios_from_right",
        }}
      />
    </View>
  );
}
