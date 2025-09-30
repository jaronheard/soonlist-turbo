import { useEffect } from "react";
import { Linking } from "react-native";
import * as QuickActions from "expo-quick-actions";
import { useRouter } from "expo-router";

import { logDebug, logError } from "~/utils/errorLogging";

/**
 * Hook to set up and handle home screen quick actions (3D Touch/Haptic Touch on iOS, long-press on Android)
 */
export function useQuickActions() {
  const router = useRouter();

  useEffect(() => {
    // Set up quick actions when the app launches
    const setupQuickActions = async () => {
      try {
        await QuickActions.setItems([
          {
            id: "upcoming-events",
            title: "Upcoming",
            subtitle: "View your upcoming events",
            icon: "symbol:calendar",
            params: { href: "/feed" },
          },
          {
            id: "past-events",
            title: "Capture Event",
            subtitle: "View your past events",
            icon: "symbol:calendar.circle",
            params: { href: "/past" },
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
        logDebug("Quick actions set up successfully");
      } catch (error) {
        logError("Failed to set up quick actions", error);
      }
    };

    void setupQuickActions();

    // Listen for quick action events
    const subscription = QuickActions.addListener((action) => {
      logDebug("Quick action triggered", { actionId: action.id });

      const href = action.params?.href;
      if (!href || typeof href !== "string") {
        logError("Quick action missing href parameter", { action });
        return;
      }

      // Handle external URLs (mailto and app store)
      if (href.startsWith("mailto:") || href.startsWith("http")) {
        Linking.openURL(href).catch((error) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          logError("Failed to open URL", { href, error });
        });
      } else {
        // Handle in-app navigation
        try {
          router.push(href as never);
        } catch (error) {
          logError("Failed to navigate to route", { href, error });
        }
      }
    });

    // Cleanup listener on unmount
    return () => {
      subscription.remove();
    };
  }, [router]);
}
