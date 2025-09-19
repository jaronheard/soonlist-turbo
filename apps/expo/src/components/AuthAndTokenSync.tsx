import { useCallback, useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-expo";
import * as Sentry from "@sentry/react-native";
import { useConvexAuth } from "convex/react";
import { usePostHog } from "posthog-react-native";

import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { api } from "@soonlist/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { logError } from "~/utils/errorLogging";
import Config from "~/utils/config";

// Lazy import to avoid React Native requiring native module on web
let SharedGroupPreferences: undefined | {
  setItem: (
    key: string,
    value: string,
    suiteName: string,
  ) => Promise<void>;
};
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  SharedGroupPreferences = require("react-native-shared-group-preferences");
} catch (_) {
  SharedGroupPreferences = undefined;
}

export default function AuthAndTokenSync() {
  const { user } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { login, isInitialized } = useRevenueCat();
  const posthog = usePostHog();
  const createShareToken = useMutation(api.shareTokens.createShareToken);

  const didCreateRef = useRef(false);

  const appGroup = Config.env === "development"
    ? "group.com.soonlist.dev"
    : "group.com.soonlist";

  const persistToAppGroup = useCallback(async (kv: Record<string, string>) => {
    if (!SharedGroupPreferences) return;
    try {
      for (const [key, value] of Object.entries(kv)) {
        await SharedGroupPreferences.setItem(key, value, appGroup);
      }
    } catch (err) {
      logError("Failed writing to App Group", err);
    }
  }, [appGroup]);

  const userId = user?.id;
  const username = user?.username;
  const email = user?.primaryEmailAddress?.emailAddress;

  // Sync external services based on Convex auth state
  useEffect(() => {
    // Skip if Convex auth is still loading
    if (isLoading) return;

    if (isAuthenticated && userId && username) {
      // User is authenticated in Convex
      Sentry.setUser({ id: userId, username, email });
      posthog.identify(userId, { username, email: email ?? "" });
    } else if (!isAuthenticated) {
      // User is not authenticated in Convex
      Sentry.setUser(null);
      posthog.reset();
    }
  }, [isAuthenticated, isLoading, userId, username, email, posthog]);

  // Sync RevenueCat based on Convex auth state
  useEffect(() => {
    if (isInitialized && isAuthenticated && userId) {
      login(userId).catch((error) => {
        logError("RevenueCat sync error", error);
      });
    }
  }, [isInitialized, isAuthenticated, userId, login]);

  // Create share token on first authenticated load and persist app group values
  useEffect(() => {
    const run = async () => {
      if (didCreateRef.current) return;
      if (!isAuthenticated || !userId || !username) return;
      didCreateRef.current = true;

      try {
        const { token } = await createShareToken({ userId });
        await persistToAppGroup({
          shareToken: token,
          userId,
          username,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          convexHttpBaseURL: Config.convexUrl.replace(/\/$/, "") + "/", // ensure trailing slash
        });
      } catch (err) {
        logError("Failed to create or persist share token", err);
      }
    };
    void run();
  }, [isAuthenticated, userId, username, createShareToken, persistToAppGroup]);

  return null;
}
