import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import { focusManager } from "@tanstack/react-query";

export function useAppStateRefresh() {
  useEffect(() => {
    function onAppStateChange(status: string) {
      if (Platform.OS !== "web") {
        focusManager.setFocused(status === "active");
      }
    }

    const subscription = AppState.addEventListener("change", onAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);
}
