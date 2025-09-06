import { useCallback, useEffect, useMemo } from "react";

import Config from "~/utils/config";
import { logError } from "~/utils/errorLogging";
import { SecureKeychain, WHEN_UNLOCKED } from "~/utils/keychain";

const getAccessGroup = () =>
  Config.env === "development"
    ? "group.com.soonlist.dev"
    : "group.com.soonlist";

const useEnvSync = () => {
  const saveEnvVar = useCallback(async (key: string, value: string | null) => {
    try {
      const accessGroup = getAccessGroup();
      if (value) {
        await SecureKeychain.setItemAsync(key, value, {
          keychainAccessible: WHEN_UNLOCKED,
          accessGroup,
        });
      } else {
        await SecureKeychain.deleteItemAsync(key, { accessGroup });
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
