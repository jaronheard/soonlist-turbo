import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";

import Config from "~/utils/config";

const saveEnvVar = async (key: string, value: string | null) => {
  try {
    if (value) {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
        keychainAccessGroup:
          Config.env === "development"
            ? "group.com.soonlist.dev"
            : "group.com.soonlist",
      });
    } else {
      await SecureStore.deleteItemAsync(key, {
        keychainAccessGroup:
          Config.env === "development"
            ? "group.com.soonlist.dev"
            : "group.com.soonlist",
      });
    }
  } catch (error) {
    console.error(`Error syncing ${key}:`, error);
  }
};

const useEnvSync = () => {
  const [envVars, setEnvVars] = useState({
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: Config.clerkPublishableKey,
    EXPO_PUBLIC_API_BASE_URL: Config.apiBaseUrl,
    EXPO_PUBLIC_APP_ENV: Config.env,
  });

  useEffect(() => {
    const syncEnvVars = async () => {
      const newEnvVars = {
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: Config.clerkPublishableKey,
        EXPO_PUBLIC_API_BASE_URL: Config.apiBaseUrl,
        EXPO_PUBLIC_APP_ENV: Config.env,
      };

      await Promise.all(
        Object.entries(newEnvVars).map(([key, value]) =>
          saveEnvVar(key, value),
        ),
      );

      setEnvVars(newEnvVars);
    };

    void syncEnvVars();
  }, []);

  return envVars;
};

export default useEnvSync;
