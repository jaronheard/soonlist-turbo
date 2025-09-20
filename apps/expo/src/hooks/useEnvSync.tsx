import { useCallback, useEffect, useMemo } from "react";
import * as SecureStore from "expo-secure-store";

import Config from "~/utils/config";
import { logError } from "~/utils/errorLogging";

const getAccessGroup = () =>
  Config.env === "development"
    ? "group.com.soonlist.dev"
    : "group.com.soonlist";

const useEnvSync = () => {
  const saveEnvVar = useCallback(async (key: string, value: string | null) => {
    try {
      const accessGroup = getAccessGroup();
      if (value) {
        await SecureStore.setItemAsync(key, value, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED,
          accessGroup,
        });
      } else {
        await SecureStore.deleteItemAsync(key, { accessGroup });
      }
    } catch (error) {
      logError(`Error syncing ${key}`, error);
    }
  }, []);

  const envVars = useMemo(
    () => ({
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: Config.clerkPublishableKey,
      EXPO_PUBLIC_API_BASE_URL: Config.apiBaseUrl,
      EXPO_PUBLIC_APP_ENV: Config.env,
      EXPO_PUBLIC_CONVEX_URL: Config.convexUrl,
    }),
    [],
  );

  useEffect(() => {
    const syncEnvVars = async () => {
      await Promise.all(
        Object.entries(envVars).map(([key, value]) => saveEnvVar(key, value)),
      );
    };

    void syncEnvVars();
  }, [envVars, saveEnvVar]);

  return envVars;
};

export default useEnvSync;
