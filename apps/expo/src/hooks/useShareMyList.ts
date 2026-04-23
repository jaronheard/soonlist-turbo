import { useCallback } from "react";
import { Platform, Share } from "react-native";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import Config from "~/utils/config";
import { logError } from "~/utils/errorLogging";

interface RequestShareOptions {
  eventCount?: number;
}

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

  const requestShare = useCallback(
    (options?: RequestShareOptions) => {
      if (currentUser?.hasSharedListBefore) {
        void openNativeShare();
        return;
      }
      router.push({
        pathname: "/share-setup",
        params:
          typeof options?.eventCount === "number"
            ? { count: String(options.eventCount) }
            : {},
      });
    },
    [currentUser?.hasSharedListBefore, openNativeShare],
  );

  return { requestShare };
}
