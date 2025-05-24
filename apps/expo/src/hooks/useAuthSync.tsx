import { useCallback, useEffect, useMemo } from "react";
import * as SecureStore from "expo-secure-store";
import { useAuth, useUser } from "@clerk/clerk-expo";
import * as Sentry from "@sentry/react-native";
import { usePostHog } from "posthog-react-native";

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

const useAuthSync = () => {
  const { getToken } = useAuth();
  const { user } = useUser();
  const posthog = usePostHog();

  const username = user?.username;
  const userId = user?.id;
  const email = user?.primaryEmailAddress?.emailAddress;
  const hasUserInfo = username && userId;

  const authData = useMemo(() => {
    if (hasUserInfo) {
      return {
        userId: userId,
        username: username,
        email: email,
      };
    }
    return null;
  }, [hasUserInfo, userId, username, email]);

  const syncAuthData = useCallback(async () => {
    if (authData?.username && authData.userId) {
      const authToken = await getToken();
      await saveAuthData({
        username: authData.username,
        authToken,
        email: authData.email ?? null,
      });

      // Identify user for Sentry
      Sentry.setUser({
        id: authData.userId,
        username: authData.username,
        email: authData.email,
      });

      // Identify user for PostHog
      posthog.identify(authData.userId, {
        username: authData.username,
        email: authData.email,
      });
    }
  }, [authData, getToken, posthog]);

  useEffect(() => {
    void syncAuthData();
  }, [syncAuthData]);

  return authData;
};

export default useAuthSync;
