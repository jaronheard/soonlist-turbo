import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as Notifications from "expo-notifications";
import { useUploadQueueStore } from "../store/useUploadQueueStore";
import { useUploadQueueUi } from "../hooks/useFeatureFlags";

interface UploadQueueContextType {
  isBackgrounded: boolean;
  setIsBackgrounded: (value: boolean) => void;
}

const UploadQueueContext = createContext<UploadQueueContextType | null>(null);

export const useUploadQueue = (): UploadQueueContextType => {
  const context = useContext(UploadQueueContext);
  if (!context) {
    throw new Error("useUploadQueue must be used within an UploadQueueProvider");
  }
  return context;
};

export function UploadQueueProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [isBackgrounded, setIsBackgrounded] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState,
  );
  
  // Feature flag for new upload queue UI
  const useUploadQueueUiEnabled = useUploadQueueUi();

  // Get queue data from store
  const {
    getActiveItems,
    getCompletedItems,
    clearCompletedItems,
  } = useUploadQueueStore();

  // Handle app state changes
  useEffect(() => {
    if (!useUploadQueueUiEnabled) return undefined;

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      // Detect when app goes to background
      if (
        appState.match(/active/) &&
        nextAppState.match(/inactive|background/)
      ) {
        setIsBackgrounded(true);
      }

      // Detect when app comes back to foreground
      if (
        appState.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        setIsBackgrounded(false);
      }

      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState, useUploadQueueUiEnabled]);

  // Handle background notifications
  useEffect(() => {
    if (!useUploadQueueUiEnabled) return undefined;

    // Check for completed uploads when app is backgrounded
    const checkBackgroundUploads = setInterval(() => {
      if (isBackgrounded) {
        const activeItems = getActiveItems();
        const completedItems = getCompletedItems();

        // If we have completed items and no active items, send notification
        if (completedItems.length > 0 && activeItems.length === 0) {
          const count = completedItems.length;
          const message =
            count === 1
              ? "1 photo uploaded successfully"
              : `${count} photos uploaded successfully`;

          void Notifications.scheduleNotificationAsync({
            content: {
              title: "Upload Complete",
              body: message,
            },
            trigger: null, // Send immediately
          });

          // Clear completed items after notification
          clearCompletedItems();
        }
      }
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(checkBackgroundUploads);
    };
  }, [
    isBackgrounded,
    getActiveItems,
    getCompletedItems,
    clearCompletedItems,
    useUploadQueueUiEnabled,
  ]);

  // Only provide context if feature flag is enabled
  if (!useUploadQueueUiEnabled) {
    return <>{children}</>;
  }

  return (
    <UploadQueueContext.Provider
      value={{
        isBackgrounded,
        setIsBackgrounded,
      }}
    >
      {children}
    </UploadQueueContext.Provider>
  );
}

