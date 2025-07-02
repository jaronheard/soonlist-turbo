import { useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { useAuth, useUser } from "@clerk/clerk-expo";
import * as Sentry from "@sentry/react-native";
import { useConvexAuth } from "convex/react";
import { usePostHog } from "posthog-react-native";

import { useTokenRefresh } from "~/hooks/useTokenRefresh";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { logError } from "~/utils/errorLogging";
import { getAccessGroup } from "~/utils/getAccessGroup";

const saveAuthData = async (authData: {
  username: string | null;
  authToken: string | null;
  email: string | null;
}) => {
  try {
    await SecureStore.setItemAsync("authData", JSON.stringify(authData), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
      accessGroup: getAccessGroup(),
    });
  } catch (error) {
    logError("Error saving auth data", error);
  }
};

export const deleteAuthData = async () => {
  try {
    await SecureStore.deleteItemAsync("authData", {
      accessGroup: getAccessGroup(),
    });
  } catch (error: unknown) {
    logError("Error deleting auth data", error);
  }
};

// Debug function to verify access group functionality
export const getAuthData = async (): Promise<{
  username: string | null;
  authToken: string | null;
  email: string | null;
} | null> => {
  try {
    const data = await SecureStore.getItemAsync("authData", {
      accessGroup: getAccessGroup(),
    });
    return data
      ? (JSON.parse(data) as {
          username: string | null;
          authToken: string | null;
          email: string | null;
        })
      : null;
  } catch (error) {
    logError("Error getting auth data", error);
    return null;
  }
};

export default function AuthAndTokenSync() {
  const { getToken, userId, sessionId } = useAuth();
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const { login, isInitialized } = useRevenueCat();
  const posthog = usePostHog();

  // Use token refresh hook to keep tokens fresh
  useTokenRefresh();

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

          const authToken = await getToken({ template: "convex" });
          if (cancelled) return;

          // Only save if we successfully got a token
          if (authToken) {
            await saveAuthData({
              username,
              authToken,
              email: email ?? null,
            });

            if (cancelled) return;

            Sentry.setUser({ id: userId, username, email });
            posthog.identify(userId, { username, email: email ?? "" });
          } else {
            logError("Failed to get Convex token", new Error("Token is null"));
          }
        } else if (!isSignedIn) {
          // USER IS SIGNED OUT
          if (cancelled) return;

          Sentry.setUser(null);
          posthog.reset();
          await deleteAuthData();
        }
      } catch (error) {
        if (!cancelled) {
          // Ignore "You are signed out" errors as these are expected during logout
          if (
            error instanceof Error &&
            !error.message?.includes("You are signed out")
          ) {
            logError("Auth sync error", error);
          }
        }
      }
    };

    void sync();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, userId, username, email, getToken, posthog, sessionId]);

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
