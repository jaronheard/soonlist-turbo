import React, { useEffect, useState, useRef } from "react";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";

import {
  useQueueCounts,
  useUploadQueueStore,
} from "~/store/useUploadQueueStore";
import { UploadStatusSheet, registerSheetSetter } from "./UploadStatusSheet";
import { registerBannerSetter } from "./InlineBanner";
import { featureFlags } from "~/utils/featureFlags";

export function UploadQueueProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Skip rendering if feature flag is disabled
  if (!featureFlags.useUploadQueueUi) {
    return <>{children}</>;
  }

  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [banner, setBanner] = useState<React.ReactNode | null>(null);
  const { total, failed } = useQueueCounts();
  const backgroundedAtRef = useRef<number | null>(null);
  const wasQueueActiveRef = useRef(false);

  // Register global setters
  useEffect(() => {
    registerSheetSetter(setIsSheetVisible);
    registerBannerSetter(setBanner);
  }, []);

  // Handle app state changes for background notifications
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        backgroundedAtRef.current = Date.now();
        wasQueueActiveRef.current = total > 0;
      }

      if (state === "active") {
        // Clear delivered notifications when returning to the app
        if (
          backgroundedAtRef.current &&
          Date.now() - backgroundedAtRef.current > 2000
        ) {
          Notifications.dismissAllNotificationsAsync();
        }

        // Check if queue became empty while backgrounded
        if (wasQueueActiveRef.current && total === 0) {
          const items = useUploadQueueStore.getState().items;
          const successCount = items.filter(
            (item) => item.status === "success",
          ).length;

          // Schedule notification
          Notifications.scheduleNotificationAsync({
            content: {
              title: failed
                ? `${failed} event failed`
                : `${successCount} new events ready`,
              body: failed ? "Tap to retry." : "Open to view.",
            },
            trigger: null, // Immediate delivery
          });
        }

        backgroundedAtRef.current = null;
        wasQueueActiveRef.current = false;
      }
    });

    return () => {
      subscription.remove();
    };
  }, [total, failed]);

  // Auto-open sheet on first failure
  useEffect(() => {
    if (failed > 0 && !isSheetVisible) {
      setIsSheetVisible(true);
    }
  }, [failed, isSheetVisible]);

  return (
    <>
      {children}
      <UploadStatusSheet
        isVisible={isSheetVisible}
        onClose={() => setIsSheetVisible(false)}
      />
      {banner}
    </>
  );
}
