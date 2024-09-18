import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import * as Updates from "expo-updates";

const CHECK_INTERVAL = 600 * 1000; // Check every 10 minutes

export function useBackgroundUpdate() {
  // Check if we're in production
  const isProduction = !__DEV__;

  const appState = useRef(AppState.currentState);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkForUpdate = useCallback(async () => {
    if (!isProduction) return;

    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      }
    } catch (error) {
      console.error("Error checking for update:", error);
    }
  }, [isProduction]);

  const scheduleNextCheck = useCallback(() => {
    if (!isProduction) return;

    timeoutRef.current = setTimeout(() => {
      void checkForUpdate();
    }, CHECK_INTERVAL);
  }, [checkForUpdate, isProduction]);

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

    void checkForUpdate();
    scheduleNextCheck();

    return () => {
      subscription.remove();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [checkForUpdate, scheduleNextCheck, isProduction]);

  return null;
}
