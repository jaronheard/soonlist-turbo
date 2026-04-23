import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useConvex, useConvexAuth, useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { useAppStore } from "~/store";
import { logDebug } from "~/utils/errorLogging";

export function usePendingFollow() {
  const router = useRouter();
  const convex = useConvex();
  const { isAuthenticated } = useConvexAuth();
  const pendingFollowUsername = useAppStore(
    (state) => state.pendingFollowUsername,
  );
  const setPendingFollowUsername = useAppStore(
    (state) => state.setPendingFollowUsername,
  );
  const followedLists = useQuery(
    api.lists.getFollowedLists,
    isAuthenticated ? {} : "skip",
  );
  const lastProcessedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !pendingFollowUsername) {
      return;
    }

    if (followedLists === undefined) {
      return;
    }

    if (lastProcessedRef.current === pendingFollowUsername) {
      return;
    }

    lastProcessedRef.current = pendingFollowUsername;

    const usernameToFollow = pendingFollowUsername;
    const hasExistingFollows = followedLists.length > 0;

    logDebug("Processing pending follow", {
      username: usernameToFollow,
      hasExistingFollows,
    });

    if (!hasExistingFollows) {
      router.push("/(tabs)/following");
      return;
    }

    void (async () => {
      try {
        const result = await convex.mutation(api.lists.followUserByUsername, {
          username: usernameToFollow,
        });

        if (result.success) {
          logDebug("Auto-follow completed", { username: usernameToFollow });
        } else {
          logDebug("Auto-follow skipped", {
            username: usernameToFollow,
            reason: result.reason,
          });
        }
      } catch (error) {
        console.error("Auto-follow failed:", error);
      }

      if (lastProcessedRef.current !== usernameToFollow) {
        return;
      }

      setPendingFollowUsername(null);
      router.push("/(tabs)/feed");
    })();
  }, [
    isAuthenticated,
    pendingFollowUsername,
    setPendingFollowUsername,
    router,
    convex,
    followedLists,
  ]);

  useEffect(() => {
    if (!isAuthenticated) {
      lastProcessedRef.current = null;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!pendingFollowUsername) {
      lastProcessedRef.current = null;
    }
  }, [pendingFollowUsername]);
}
