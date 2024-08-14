import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { api } from "~/utils/api";

export function useAppStateRefresh() {
  const utils = api.useUtils();
  const appState = useRef(AppState.currentState);
  const lastRefreshTime = useRef<number | null>(null);

  const refreshEvents = () => {
    const now = Date.now();
    if (!lastRefreshTime.current || now - lastRefreshTime.current > 1000) {
      void utils.event.invalidate();
      lastRefreshTime.current = now;
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        refreshEvents();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [utils]);

  return refreshEvents;
}
