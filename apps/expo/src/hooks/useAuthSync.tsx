import { useCallback, useEffect, useMemo } from "react";
import * as SecureStore from "expo-secure-store";
import { useAuth, useUser } from "@clerk/clerk-expo";

import Config from "~/utils/config";

const saveAuthData = async (authData: {
  username: string | null;
  authToken: string | null;
  expoPushToken: string | null;
}) => {
  try {
    await SecureStore.setItemAsync("authData", JSON.stringify(authData), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
      keychainAccessGroup:
        Config.env === "development"
          ? "group.com.soonlist.dev"
          : "group.com.soonlist",
    });
    console.log("Auth data saved successfully");
  } catch (error) {
    console.error(
      "Error saving auth data:",
      error instanceof Error ? error.message : String(error),
    );
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
    console.log("Auth data deleted successfully");
  } catch (error: unknown) {
    console.error(
      "Error deleting auth data:",
      error instanceof Error ? error.message : String(error),
    );
  }
};

const useAuthSync = ({ expoPushToken }: { expoPushToken: string }) => {
  const { getToken } = useAuth();
  const { user } = useUser();

  const username = user?.username;
  const userId = user?.id;
  const hasUserInfo = username && userId;

  const authData = useMemo(() => {
    if (hasUserInfo) {
      return {
        userId: userId,
        username: username,
        expoPushToken,
      };
    }
    return null;
  }, [hasUserInfo, userId, username, expoPushToken]);

  const syncAuthData = useCallback(async () => {
    if (authData?.username && authData.userId) {
      const authToken = await getToken();
      await saveAuthData({
        username: authData.username,
        authToken,
        expoPushToken: authData.expoPushToken,
      });
    }
  }, [authData, getToken]);

  useEffect(() => {
    void syncAuthData();
  }, [syncAuthData]);

  return authData;
};

export default useAuthSync;
