import { useCallback, useEffect, useMemo } from "react";
import * as SecureStore from "expo-secure-store";

import Config from "~/utils/config";

const getKeychainAccessGroup = () =>
  Config.env === "development"
    ? "group.com.soonlist.dev"
    : "group.com.soonlist";

const useEnvSync = () => {
  const saveEnvVar = useCallback(async (key: string, value: string | null) => {
    try {
      const keychainAccessGroup = getKeychainAccessGroup();
      if (value) {
        await SecureStore.setItemAsync(key, value, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED,
          keychainAccessGroup,
        });
      } else {
        await SecureStore.deleteItemAsync(key, { keychainAccessGroup });
      }
    } catch (error) {
      console.error(`Error syncing ${key}:`, error);
    }
  }, []);

  const envVars = useMemo(
    () => ({
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: Config.clerkPublishableKey,
      EXPO_PUBLIC_API_BASE_URL: Config.apiBaseUrl,
      EXPO_PUBLIC_APP_ENV: Config.env,
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
