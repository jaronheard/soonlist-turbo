import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const GUEST_USER_KEY = "soonlist_guest_user_id";
export const HAS_GUEST_EVENTS_KEY = "has_guest_events";

export const useGuestUser = () => {
  const [guestUserId, setGuestUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeGuestUser = async () => {
      try {
        let existingGuestId = await AsyncStorage.getItem(GUEST_USER_KEY);

        console.log("[GUEST_USER] Initializing guest user", {
          existingGuestId,
          hasExisting: !!existingGuestId,
          timestamp: new Date().toISOString(),
        });

        if (!existingGuestId) {
          // Generate a new guest ID
          existingGuestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await AsyncStorage.setItem(GUEST_USER_KEY, existingGuestId);
          
          console.log("[GUEST_USER] Generated new guest ID", {
            newGuestId: existingGuestId,
          });
        }

        setGuestUserId(existingGuestId);
        
        console.log("[GUEST_USER] Guest user initialization complete", {
          finalGuestId: existingGuestId,
        });
      } catch (error) {
        console.error("[GUEST_USER] Error initializing guest user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void initializeGuestUser();
  }, []);

  const clearGuestData = async () => {
    try {
      await AsyncStorage.multiRemove([GUEST_USER_KEY, HAS_GUEST_EVENTS_KEY]);
    } catch (error) {
      console.error("Error clearing guest data:", error);
    }
  };

  return {
    guestUserId,
    isLoading,
    clearGuestData,
  };
};
