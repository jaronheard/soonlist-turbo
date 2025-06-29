import { View } from "react-native";
import { Stack, Redirect } from "expo-router";
import { useConvexAuth } from "convex/react";

export const TOTAL_ONBOARDING_STEPS = 8;

export default function OnboardingLayout() {
  const { isAuthenticated } = useConvexAuth();
  
  // If user is authenticated, redirect them to feed
  // Authenticated users should never see onboarding
  if (isAuthenticated) {
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
