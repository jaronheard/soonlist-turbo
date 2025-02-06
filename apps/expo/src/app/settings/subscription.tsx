import { useEffect } from "react";
import { Linking, Platform } from "react-native";
import { router, useNavigation } from "expo-router";

import { useRevenueCat } from "~/providers/RevenueCatProvider";

export default function SubscriptionScreen() {
  const { showProPaywallIfNeeded } = useRevenueCat();
  const navigation = useNavigation();

  useEffect(() => {
    if (Platform.OS === "ios") {
      // Open iOS subscription management in Settings
      void Linking.openURL("https://apps.apple.com/account/subscriptions");

      // Only go back if we can
      if (navigation.canGoBack()) {
        router.back();
      } else {
        // If we can't go back (e.g., deep linked), go to feed
        router.replace("/feed");
      }
    } else {
      // For non-iOS devices, show the RevenueCat paywall
      void showProPaywallIfNeeded().then(() => {
        if (navigation.canGoBack()) {
          router.back();
        } else {
          router.replace("/feed");
        }
      });
    }
  }, [showProPaywallIfNeeded, navigation]);

  // This screen won't actually be visible as it immediately redirects
  return null;
}
