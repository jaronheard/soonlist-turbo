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

export function useAppsFlyerDeepLink() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const setPendingFollowUsername = useAppStore(
    (state) => state.setPendingFollowUsername,
  );
  const hasProcessedDeepLink = useRef(false);

  useEffect(() => {
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

        if (data.deep_link_value === "follow" && data.deep_link_sub1) {
          const usernameToFollow = data.deep_link_sub1;
          logDebug("AppsFlyer: Follow intent detected", { usernameToFollow });

          hasProcessedDeepLink.current = true;

          if (isAuthenticated) {
            router.push(`/${usernameToFollow}`);
          } else {
            setPendingFollowUsername(usernameToFollow);
            logDebug("AppsFlyer: Stored pending follow for after auth", {
              usernameToFollow,
            });
          }
        }
      },
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- appsFlyer is typed as any in library
    const onDeepLinkCanceller = appsFlyer.onDeepLink(
      (result: UnifiedDeepLinkData) => {
        logDebug("AppsFlyer onDeepLink", { result });

        if (result.status === "failure") {
          logError("AppsFlyer deep link error", result);
          return;
        }

        if (result.status !== "success") {
          return;
        }

        const data = result?.data as DeepLinkData | undefined;
        if (!data) {
          return;
        }

        if (data.deep_link_value === "follow" && data.deep_link_sub1) {
          const usernameToFollow = data.deep_link_sub1;
          logDebug("AppsFlyer: Direct deep link follow intent", {
            usernameToFollow,
          });

          if (isAuthenticated) {
            router.push(`/${usernameToFollow}`);
          } else {
            setPendingFollowUsername(usernameToFollow);
          }
        }
      },
    );

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
