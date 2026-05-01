import { useCallback } from "react";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useUser } from "@clerk/clerk-expo";

import { useCreateEvent } from "~/hooks/useCreateEvent";
import { useInFlightEventStore } from "~/store/useInFlightEventStore";
import { logError } from "~/utils/errorLogging";
import { toast } from "~/utils/feedback";

/**
 * Hook to manage the flow of adding new events via the image picker.
 * Launches the native photo picker immediately and creates events for
 * the selected photos. Capture-count-based paywalls are surfaced
 * downstream (e.g. on event view) rather than being enforced here.
 */
export function useAddEventFlow() {
  const { user } = useUser();
  const { createMultipleEvents } = useCreateEvent();
  const setIsCapturing = useInFlightEventStore((s) => s.setIsCapturing);
  const setActiveBatchId = useInFlightEventStore((s) => s.setActiveBatchId);

  const triggerAddEventFlow = useCallback(async () => {
    // Early guard: prevent concurrent captures using fresh store read
    if (useInFlightEventStore.getState().isCapturing) return;

    // Set capturing state first, before any async work — eliminates dead zone
    setIsCapturing(true);

    void Haptics.selectionAsync();

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: 20, // iOS‑only; we also enforce in JS
      });

      if (!result.canceled && result.assets.length) {
        const username = user?.username;
        const userId = user?.id;

        // Ensure user info is available before proceeding
        if (!username || !userId) {
          setIsCapturing(false);
          toast.error("User information not available");
          logError(
            "User info missing in triggerAddEventFlow",
            new Error("Username or UserID is null"),
            { userId, username },
          );
          return;
        }

        const assets = result.assets.slice(0, 20);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
          const batchId = await createMultipleEvents(
            assets.map((asset) => ({
              imageUri: asset.uri,
              userId,
              username,
            })),
            { suppressCapturing: true },
          );
          if (batchId) {
            setActiveBatchId(batchId);
          }
          return batchId;
        } catch (err) {
          logError("Failed to create events", err, { userId, username });
          toast.error("Failed to add events", "Please try again");
        } finally {
          setIsCapturing(false);
        }
      } else {
        setIsCapturing(false);
      }
    } catch (err) {
      logError("Error in triggerAddEventFlow photo picker", err);
      toast.error("Failed to open photo picker", "Please try again");
      setIsCapturing(false);
    }
  }, [user, createMultipleEvents, setActiveBatchId, setIsCapturing]);

  return { triggerAddEventFlow };
}
