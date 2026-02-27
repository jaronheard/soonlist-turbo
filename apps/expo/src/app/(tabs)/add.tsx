import { View } from "react-native";

// Placeholder screen for the "Capture" tab.
// The actual photo picker is launched from the tab layout's tabPress listener
// so it opens immediately without waiting for this screen to mount.
export default function AddEventScreen() {
  return <View className="flex-1 bg-interactive-3" />;
}

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";
