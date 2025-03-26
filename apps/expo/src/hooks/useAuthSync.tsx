import { useCallback, useEffect, useMemo } from "react";
import * as SecureStore from "expo-secure-store";
import { useAuth, useUser } from "@clerk/clerk-expo";
import * as Sentry from "@sentry/react-native";
import { usePostHog } from "posthog-react-native";

import { syncUserData } from "~/utils/userDataSync";
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
      keychainAccessGroup:
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
      keychainAccessGroup:
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

      // Sync user data across all services
      await syncUserData(
        {
          userId: authData.userId,
          email: authData.email,
          username: authData.username,
          name: user?.fullName || user?.firstName || user?.lastName || undefined,
          createdAt: user?.createdAt,
          lastActive: new Date().toISOString(),
        },
        posthog
      );
    }
  }, [authData, getToken, posthog, user]);

  useEffect(() => {
    void syncAuthData();
  }, [syncAuthData]);

  return authData;
};

export default useAuthSync;
