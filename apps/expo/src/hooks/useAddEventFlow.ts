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
 * Launches the photo picker immediately, then checks the paywall
 * after the user selects photos (before creating events).
 */
export function useAddEventFlow() {
  const { user } = useUser();
  const { createMultipleEvents } = useCreateEvent();
  const { setIsCapturing } = useInFlightEventStore();

  const triggerAddEventFlow = useCallback(async () => {
    // Light feedback on intent to capture
    await Haptics.selectionAsync();

    // Set capturing state to true immediately when photo selector opens
    setIsCapturing(true);

    // 1. Launch native photo picker directly
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

        // 2. Create events for all selected images
        const assets = result.assets.slice(0, 20);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
          await createMultipleEvents(
            assets.map((asset) => ({
              imageUri: asset.uri,
              userId,
              username,
            })),
          );
        } catch (err) {
          logError("Failed to create events", err, { userId, username });
          toast.error("Failed to add events", "Please try again");
        } finally {
          setIsCapturing(false);
        }
      } else {
        // User canceled or didn't select any images
        setIsCapturing(false);
      }
    } catch (err) {
      logError("Error in triggerAddEventFlow photo picker", err);
      toast.error("Failed to open photo picker", "Please try again");
      setIsCapturing(false);
    }
  }, [user, createMultipleEvents, setIsCapturing]);

  return { triggerAddEventFlow };
}
