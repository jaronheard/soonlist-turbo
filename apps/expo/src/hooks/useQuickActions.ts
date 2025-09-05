import { useEffect } from "react";
import { Linking } from "react-native";
import * as QuickActions from "expo-quick-actions";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";

export function useQuickActions() {
  useEffect(() => {
    const setupQuickActions = async () => {
      try {
        await QuickActions.setItems([
          {
            id: "upcoming-events",
            title: "Upcoming",
            subtitle: "View your upcoming events",
            icon: "symbol:calendar",
            params: { href: "/(tabs)/feed" },
          },
          {
            id: "past-events",
            title: "Capture Event",
            subtitle: "View your past events",
            icon: "symbol:calendar.circle",
            params: { href: "/(tabs)/past" },
          },
          {
            id: "leave-feedback",
            title: "Leave Feedback",
            subtitle: "Help us improve – don't delete yet!",
            icon: "symbol:envelope",
            params: {
              href: "mailto:jaron@soonlist.com?subject=Feedback&body=Hi, I'd like to share some feedback...",
            },
          },
          {
            id: "rate-app",
            title: "Rate App",
            subtitle: "Love it? Leave a review!",
            icon: "symbol:star.fill",
            params: {
              href: "https://apps.apple.com/us/app/soonlist-save-events-instantly/id6670222216",
            },
          },
        ]);
      } catch (error) {
        console.error("Failed to set quick actions:", error);
      }
    };

    void setupQuickActions();

    // Handle quick action selection
    const handleQuickAction = (action: QuickActions.Action) => {
      const params = action.params;
      if (!params || typeof params !== "object" || !("href" in params)) {
        return;
      }
      const { href } = params as { href: string };

      if (href.startsWith("mailto:")) {
        // Handle email links
        void Linking.openURL(href);
        return;
      }

      if (href.startsWith("https://")) {
        // Handle web links (App Store)
        void WebBrowser.openBrowserAsync(href);
        return;
      }

      // Handle internal navigation
      router.navigate(href as any);
    };

    // Subscribe to quick action events
    const subscription = QuickActions.addListener(handleQuickAction);

    return () => {
      subscription.remove();
    };
  }, []);
}
