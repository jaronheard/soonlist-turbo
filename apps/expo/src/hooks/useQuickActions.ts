import { useEffect } from "react";
import { Linking } from "react-native";
import * as Application from "expo-application";
import * as QuickActions from "expo-quick-actions";
import { useRouter } from "expo-router";

import { logDebug, logError } from "~/utils/errorLogging";

export function useQuickActions() {
  const router = useRouter();

  useEffect(() => {
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

    const subscription = QuickActions.addListener((action) => {
      logDebug("Quick action triggered", { actionId: action.id });

      const href = action.params?.href;
      if (!href || typeof href !== "string") {
        logError("Quick action missing href parameter", { action });
        return;
      }

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
