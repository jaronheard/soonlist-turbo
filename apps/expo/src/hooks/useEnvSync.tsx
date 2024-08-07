import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";

const saveEnvVar = async (key: string, value: string | null) => {
  try {
    if (value) {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
        keychainAccessGroup: "group.soonlist.soonlist",
      });
    } else {
      await SecureStore.deleteItemAsync(key, {
        keychainAccessGroup: "group.soonlist.soonlist",
      });
    }
  } catch (error) {
    console.error(`Error syncing ${key}:`, error);
  }
};

const useEnvSync = () => {
  const [envVars, setEnvVars] = useState({
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || null,
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || null,
  });

  useEffect(() => {
    const syncEnvVars = async () => {
      console.log("syncing env vars");
      console.log("process.env", process.env);

      const newEnvVars = {
        EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:
          process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || null,
        EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || null,
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
