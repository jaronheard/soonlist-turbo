import { useCallback } from "react";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useUser } from "@clerk/clerk-expo";
import { toast } from "sonner-native";

import { useCreateEvent } from "~/hooks/useCreateEvent";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore } from "~/store";
import { logError } from "~/utils/errorLogging";

/**
 * Hook to manage the flow of adding new events via the image picker.
 * Encapsulates paywall checks, image selection, and event queuing.
 */
export function useAddEventFlow() {
  const { resetAddEventState } = useAppStore((state) => ({
    resetAddEventState: state.resetAddEventState,
  }));
  const { customerInfo, showProPaywallIfNeeded } = useRevenueCat();
  const hasUnlimited =
    customerInfo?.entitlements.active.unlimited?.isActive ?? false;
  const { user } = useUser();
  const { enqueueEvents } = useCreateEvent();

  const triggerAddEventFlow = useCallback(async () => {
    // 1. Paywall gate
    if (!hasUnlimited) {
      void showProPaywallIfNeeded();
      return;
    }

    // 2. Clear draft state
    resetAddEventState();
    // Light feedback on intent to capture
    await Haptics.selectionAsync();

    // 3. Launch native photo picker directly
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Use enum for clarity
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 20, // iOS‑only; we also enforce in JS
      });

      if (!result.canceled && result.assets.length) {
        const username = user?.username;
        const userId = user?.id;

        // Ensure user info is available before proceeding
        if (!username || !userId) {
          toast.error("User information not available");
          logError(
            "User info missing in triggerAddEventFlow",
            new Error("Username or UserID is null"),
            { userId, username },
          );
          return;
        }

        // Respect the 20‑image limit in case the platform ignores selectionLimit
        const assets = result.assets.slice(0, 20);

        // Queue the jobs – they'll keep running even if the app backgrounds
        // Medium impact to confirm jobs queued
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        void enqueueEvents(
          assets.map((asset) => ({
            imageUri: asset.uri,
            userId,
            username,
          })),
        );
      }
    } catch (err) {
      // Check for specific permission errors if needed, although useMediaPermissions handles this broadly
      logError("Error in triggerAddEventFlow photo picker", err);
      toast.error("Failed to open photo picker. Please try again.");
    }
  }, [
    hasUnlimited,
    showProPaywallIfNeeded,
    resetAddEventState,
    user,
    enqueueEvents,
  ]);

  return { triggerAddEventFlow };
}
