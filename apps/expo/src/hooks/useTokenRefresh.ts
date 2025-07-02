import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useAuth } from "@clerk/clerk-expo";

import { logError, logMessage } from "~/utils/errorLogging";

/**
 * Hook to monitor and refresh Clerk tokens for Convex
 * - Refreshes token when app comes to foreground
 * - Periodically checks token validity
 * - Ensures fresh tokens for WebSocket connections
 */
export function useTokenRefresh() {
  const { getToken, isSignedIn } = useAuth();
  const lastRefreshRef = useRef<Date>(new Date());
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    if (!isSignedIn) return;

    // Function to refresh token
    const refreshToken = async () => {
      try {
        const now = new Date();
        const timeSinceLastRefresh =
          now.getTime() - lastRefreshRef.current.getTime();

        // Only refresh if it's been more than 30 seconds since last refresh
        if (timeSinceLastRefresh < 30000) {
          return;
        }

        const token = await getToken({ template: "convex" });
        if (token) {
          lastRefreshRef.current = now;
          logMessage("Token refreshed successfully", {}, { type: "info" });
        } else {
          logError(
            "Failed to refresh token",
            new Error("Token refresh returned null"),
          );
        }
      } catch (error) {
        logError("Error refreshing token", error);
      }
    };

    // Handle app state changes (foreground/background)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // App has come to foreground - refresh token
        void refreshToken();
      }
      appStateRef.current = nextAppState;
    };

    // Set up app state listener
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    // Set up periodic token refresh (every 5 minutes)
    const intervalId = setInterval(() => {
      void refreshToken();
    }, 5 * 60 * 1000);

    // Initial token fetch
    void refreshToken();

    return () => {
      subscription.remove();
      clearInterval(intervalId);
    };
  }, [getToken, isSignedIn]);
}