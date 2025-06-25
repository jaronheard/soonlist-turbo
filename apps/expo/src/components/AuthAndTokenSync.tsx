import { useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { useAuth, useUser } from "@clerk/clerk-expo";
import * as Sentry from "@sentry/react-native";
import { useConvexAuth } from "convex/react";
import { usePostHog } from "posthog-react-native";

import { useRevenueCat } from "~/providers/RevenueCatProvider";
import Config from "~/utils/config";
import { logError } from "~/utils/errorLogging";

const saveAuthData = async (authData: {
  username: string | null;
  authToken: string | null;
  email: string | null;
}) => {
  try {
    await SecureStore.setItemAsync("authData", JSON.stringify(authData), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
      accessGroup:
        Config.env === "development"
          ? "group.com.soonlist.dev"
          : "group.com.soonlist",
    });
  } catch (error) {
    logError("Error saving auth data", error);
  }
};

export const deleteAuthData = async () => {
  try {
    await SecureStore.deleteItemAsync("authData", {
      accessGroup:
        Config.env === "development"
          ? "group.com.soonlist.dev"
          : "group.com.soonlist",
    });
  } catch (error: unknown) {
    logError("Error deleting auth data", error);
  }
};

export default function AuthAndTokenSync() {
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const { login, isInitialized } = useRevenueCat();
  const posthog = usePostHog();

  const username = user?.username;
  const email = user?.primaryEmailAddress?.emailAddress;

  const isSignedIn = !!userId;

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      try {
        if (cancelled) return;

        if (isSignedIn && username) {
          // USER IS SIGNED IN

          const authToken = await getToken();
          if (cancelled) return;

          await saveAuthData({
            username,
            authToken,
            email: email ?? null,
          });

          if (cancelled) return;

          Sentry.setUser({ id: userId, username, email });
          posthog.identify(userId, { username, email: email ?? "" });
        } else if (!isSignedIn) {
          // USER IS SIGNED OUT
          if (cancelled) return;

          Sentry.setUser(null);
          posthog.reset();
          await deleteAuthData();
        }
      } catch (error) {
        if (!cancelled) {
          logError("Auth sync error", error);
        }
      }
    };

    void sync();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, userId, username, email, getToken, posthog]);

  useEffect(() => {
    let cancelled = false;

    const syncRevenueCat = async () => {
      try {
        if (cancelled) return;

        if (isInitialized && isAuthenticated && userId) {
          await login(userId);
        }
      } catch (error) {
        if (!cancelled) {
          logError("RevenueCat sync error", error);
        }
      }
    };

    void syncRevenueCat();

    return () => {
      cancelled = true;
    };
  }, [isInitialized, isAuthenticated, userId, login]);

  return null;
}
