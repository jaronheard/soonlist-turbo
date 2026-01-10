import type { UnifiedDeepLinkData } from "react-native-appsflyer";
import { useEffect, useRef } from "react";
import appsFlyer from "react-native-appsflyer";
import { useRouter } from "expo-router";
import { useConvexAuth } from "convex/react";

import { useAppStore } from "~/store";
import { logDebug, logError } from "~/utils/errorLogging";

interface DeepLinkData {
  deep_link_value?: string;
  deep_link_sub1?: string;
  [key: string]: unknown;
}

interface ConversionData {
  status: string;
  type: string;
  data: DeepLinkData;
}

/**
 * Hook to handle AppsFlyer deep links (both direct and deferred)
 *
 * Direct deep links: When user clicks a link and app is already installed
 * Deferred deep links: When user clicks a link, installs the app, then opens it
 *
 * For follow intents, we expect:
 * - deep_link_value: "follow"
 * - deep_link_sub1: username to follow
 */
export function useAppsFlyerDeepLink() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const setPendingFollowUsername = useAppStore(
    (state) => state.setPendingFollowUsername,
  );
  const hasProcessedDeepLink = useRef(false);

  useEffect(() => {
    // Handle deferred deep links (new installs)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- appsFlyer is typed as any in library
    const onInstallConversionDataCanceller = appsFlyer.onInstallConversionData(
      (result: ConversionData) => {
        logDebug("AppsFlyer onInstallConversionData", { result });

        if (hasProcessedDeepLink.current) {
          return;
        }

        const data = result?.data;
        if (!data) {
          return;
        }

        // Check for follow intent
        if (data.deep_link_value === "follow" && data.deep_link_sub1) {
          const usernameToFollow = data.deep_link_sub1;
          logDebug("AppsFlyer: Follow intent detected", { usernameToFollow });

          hasProcessedDeepLink.current = true;

          if (isAuthenticated) {
            // User is already authenticated, navigate directly to profile
            router.push(`/${usernameToFollow}`);
          } else {
            // User needs to authenticate first, store the pending follow
            setPendingFollowUsername(usernameToFollow);
            logDebug("AppsFlyer: Stored pending follow for after auth", {
              usernameToFollow,
            });
          }
        }
      },
    );

    // Handle direct deep links (app already installed)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- appsFlyer is typed as any in library
    const onDeepLinkCanceller = appsFlyer.onDeepLink(
      (result: UnifiedDeepLinkData) => {
        logDebug("AppsFlyer onDeepLink", { result });

        if (hasProcessedDeepLink.current) {
          return;
        }

        if (result.status === "failure") {
          logError("AppsFlyer deep link error", result);
          return;
        }

        if (result.status !== "success") {
          return;
        }

        const data =
          result.data && typeof result.data === "object"
            ? (result.data as DeepLinkData)
            : undefined;
        if (!data) {
          return;
        }

        // Check for follow intent
        if (data.deep_link_value === "follow" && data.deep_link_sub1) {
          const usernameToFollow = data.deep_link_sub1;
          logDebug("AppsFlyer: Direct deep link follow intent", {
            usernameToFollow,
          });

          hasProcessedDeepLink.current = true;

          if (isAuthenticated) {
            // User is authenticated, navigate directly to profile
            router.push(`/${usernameToFollow}`);
          } else {
            // User needs to authenticate first, store the pending follow
            setPendingFollowUsername(usernameToFollow);
          }
        }
      },
    );

    // Cleanup listeners
    return () => {
      if (onInstallConversionDataCanceller) {
        onInstallConversionDataCanceller();
      }
      if (onDeepLinkCanceller) {
        onDeepLinkCanceller();
      }
    };
  }, [isAuthenticated, router, setPendingFollowUsername]);
}
