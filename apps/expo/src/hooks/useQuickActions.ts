import { useEffect } from "react";
import { Linking } from "react-native";
import * as Application from "expo-application";
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
            id: "share-feedback",
            title: "Deleting? Tell us why.",
            subtitle: "Send feedback before you delete.",
            icon: "symbol:square.and.pencil",
            params: {
              href: `mailto:jaron@soonlist.com?subject=Delete Feedback - v${Application.nativeApplicationVersion} ${Application.nativeBuildVersion}&body=Hi, I'd like to share some feedback...`,
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
        logError("Invalid href format", { href });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);
}
