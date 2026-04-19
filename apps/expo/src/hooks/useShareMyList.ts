import { useCallback } from "react";
import { Platform, Share } from "react-native";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import Config from "~/utils/config";
import { logError } from "~/utils/errorLogging";

/**
 * Kicks off a share of the user's personal Soonlist. On the first share
 * attempt (hasSharedListBefore false/undefined), routes to the share-setup
 * modal screen. Returning users skip setup and get the native share sheet.
 */
export function useShareMyList() {
  const { user } = useUser();
  const currentUser = useQuery(api.users.getCurrentUser);

  const openNativeShare = useCallback(async () => {
    const username = user?.username ?? currentUser?.username ?? "";
    if (!username) return;
    const url = `${Config.apiBaseUrl}/${username}`;
    try {
      await Share.share(Platform.OS === "ios" ? { url } : { message: url });
    } catch (error) {
      logError("Error sharing list", error);
    }
  }, [user?.username, currentUser?.username]);

  const requestShare = useCallback(() => {
    if (currentUser?.hasSharedListBefore) {
      void openNativeShare();
      return;
    }
    router.push("/share-setup");
  }, [currentUser?.hasSharedListBefore, openNativeShare]);

  return { requestShare };
}
