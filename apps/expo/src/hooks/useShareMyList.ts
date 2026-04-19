import { useCallback, useState } from "react";
import { Platform, Share } from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import Config from "~/utils/config";
import { logError } from "~/utils/errorLogging";

/**
 * Wraps Share.share for the user's personal Soon List. On the first share
 * attempt (when hasSharedListBefore is false/undefined), opens the
 * FirstShareSetupSheet instead of calling Share.share directly. After the
 * sheet commits or is dismissed via "Share now", the actual share sheet
 * is opened.
 *
 * Swipe-to-dismiss on the sheet does NOT trigger a share and does NOT
 * set hasSharedListBefore — the sheet will reappear on next attempt.
 */
export function useShareMyList() {
  const { user } = useUser();
  const currentUser = useQuery(api.users.getCurrentUser);
  const [isSetupSheetVisible, setSetupSheetVisible] = useState(false);

  const openNativeShare = useCallback(async () => {
    const username = user?.username ?? currentUser?.username ?? "";
    if (!username) return;
    const url = `${Config.apiBaseUrl}/${username}`;
    try {
      await Share.share(
        Platform.OS === "ios" ? { url } : { message: url },
      );
    } catch (error) {
      logError("Error sharing list", error);
    }
  }, [user?.username, currentUser?.username]);

  const requestShare = useCallback(() => {
    if (currentUser?.hasSharedListBefore) {
      void openNativeShare();
      return;
    }
    setSetupSheetVisible(true);
  }, [currentUser?.hasSharedListBefore, openNativeShare]);

  const closeSetupSheet = useCallback(() => {
    setSetupSheetVisible(false);
  }, []);

  const closeSetupSheetAndShare = useCallback(async () => {
    setSetupSheetVisible(false);
    await openNativeShare();
  }, [openNativeShare]);

  return {
    requestShare,
    isSetupSheetVisible,
    closeSetupSheet,
    closeSetupSheetAndShare,
  };
}
