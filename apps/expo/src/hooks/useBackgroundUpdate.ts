import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import * as Updates from "expo-updates";

import { useAppStore } from "~/store";

export function useBackgroundUpdate() {
  const isProduction = !__DEV__;
  const activeIntent = useAppStore((state) => state.activeIntent);

  const appState = useRef(AppState.currentState);

  const checkForUpdate = useCallback(async () => {
    if (!isProduction || activeIntent) return;

    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      }
    } catch (error) {
      console.error("Error checking for update:", error);
    }
  }, [isProduction, activeIntent]);

  useEffect(() => {
    if (!isProduction) return;

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active" &&
        !activeIntent
      ) {
        void checkForUpdate();
      }
      appState.current = nextAppState;
    });

    // Check for update when the component mounts (app launch)
    void checkForUpdate();

    return () => {
      subscription.remove();
    };
  }, [checkForUpdate, isProduction, activeIntent]);

  return null;
}
