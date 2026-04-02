import { View } from "react-native";
import { Redirect, Stack } from "expo-router";
import { useConvexAuth } from "convex/react";

import { useAppStore } from "~/store";

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";

export default function OnboardingLayout() {
  const { isAuthenticated } = useConvexAuth();
  const hasSeenOnboarding = useAppStore((state) => state.hasSeenOnboarding);
  const pendingFollowUsername = useAppStore(
    (state) => state.pendingFollowUsername,
  );

  // Only redirect if authenticated AND onboarding is complete AND no pending follow
  // This prevents a race condition where the redirect fires before usePendingFollow
  // can execute the auto-follow mutation
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
