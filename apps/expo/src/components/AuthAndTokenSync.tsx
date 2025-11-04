import { useCallback, useEffect, useRef } from "react";
import * as SecureStore from "expo-secure-store";
import { useUser } from "@clerk/clerk-expo";
import * as Sentry from "@sentry/react-native";
import { useConvexAuth, useMutation } from "convex/react";
import { usePostHog } from "posthog-react-native";

import { api } from "@soonlist/backend/convex/_generated/api";

import { useRevenueCat } from "~/providers/RevenueCatProvider";
import Config from "~/utils/config";
import { logError } from "~/utils/errorLogging";
import { getAccessGroup } from "~/utils/getAccessGroup";

const SHARE_TOKEN_KEY = "SL_SHARE_TOKEN";

export default function AuthAndTokenSync() {
  const { user } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { login, isInitialized } = useRevenueCat();
  const posthog = usePostHog();
  const createShareToken = useMutation(api.shareTokens.createShareToken);

  const didCreateRef = useRef(false);
  const lastCreatedForUserRef = useRef<string | null>(null);

  const persistToKeychain = useCallback(async (kv: Record<string, string>) => {
    const accessGroup = getAccessGroup();
    try {
      await Promise.all(
        Object.entries(kv).map(([key, value]) =>
          SecureStore.setItemAsync(key, value, {
            accessGroup,
            keychainAccessible: SecureStore.WHEN_UNLOCKED,
          }),
        ),
      );
    } catch (err) {
      logError("Failed writing to Keychain", err);
    }
  }, []);

  const userId = user?.id;
  const username = user?.username;
  const email = user?.primaryEmailAddress?.emailAddress;

  // Sync external services based on Convex auth state
  useEffect(() => {
    // Skip if Convex auth is still loading
    if (isLoading) return;

    if (isAuthenticated && userId && username) {
      Sentry.setUser({ id: userId, username, email });
      
      if (posthog) {
        const anonymousId = posthog.getDistinctId();
        if (anonymousId && anonymousId !== userId) {
          posthog.alias(userId);
        }
      }
      
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

  // Clear share token on sign-out
  useEffect(() => {
    if (!isAuthenticated) {
      const accessGroup = getAccessGroup();
      void SecureStore.deleteItemAsync(SHARE_TOKEN_KEY, {
        accessGroup,
      }).catch((err) => logError("Failed clearing share token", err));
      didCreateRef.current = false;
      lastCreatedForUserRef.current = null;
    }
  }, [isAuthenticated]);

  // Create share token on first authenticated load and persist keychain values
  useEffect(() => {
    const run = async () => {
      if (didCreateRef.current && lastCreatedForUserRef.current === userId)
        return;
      if (!isAuthenticated || !userId || !username) return;

      try {
        const { token } = await createShareToken({ userId });
        await persistToKeychain({
          [SHARE_TOKEN_KEY]: token,
          EXPO_PUBLIC_CONVEX_URL: Config.convexUrl.replace(/\/$/, "") + "/",
        });
        didCreateRef.current = true;
        lastCreatedForUserRef.current = userId;
      } catch (err) {
        logError("Failed to create or persist share token", err);
        didCreateRef.current = false;
        lastCreatedForUserRef.current = null;
      }
    };
    void run();
  }, [isAuthenticated, userId, username, createShareToken, persistToKeychain]);

  return null;
}
