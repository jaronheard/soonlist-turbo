import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";

export function useAppState() {
  const appState = useRef(AppState.currentState);
  const previousAppState = useRef<AppStateStatus | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      previousAppState.current = appState.current;
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return {
    current: appState.current,
    previous: previousAppState.current,
  };
}

