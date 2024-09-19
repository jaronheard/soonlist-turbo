import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import * as Updates from "expo-updates";

import { useAppStore } from "~/store";

export function useBackgroundUpdate() {
  const isProduction = !__DEV__;
  const activeIntent = useAppStore((state) => state.activeIntent);

  const appState = useRef(AppState.currentState);

  const checkForUpdate = useCallback(async () => {
    if (!isProduction) return;

    try {
      await Updates.checkForUpdateAsync();
    } catch (error) {
      console.error("Error checking for update:", error);
    }
  }, [isProduction]);

  useEffect(() => {
    if (!isProduction) return;

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
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
