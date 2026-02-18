import { View } from "react-native";
import { Redirect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";

export default function Index() {
  const { isLoaded } = useUser();

  if (!isLoaded) {
    // Show a view matching the splash screen background instead of null
    // to prevent flash when splash screen hides before redirect
    return <View style={{ flex: 1, backgroundColor: "#E0D9FF" }} />;
  }

  // Always go to feed, which will handle auth check and redirect to onboarding if needed
  return <Redirect href="/(tabs)/feed" />;
}
