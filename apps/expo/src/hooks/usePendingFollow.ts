import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useConvex, useConvexAuth } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { useAppStore } from "~/store";
import { logDebug } from "~/utils/errorLogging";

/**
 * Hook to process pending follow intents after user authentication.
 *
 * When a user clicks a follow link from the web but isn't authenticated,
 * the username is stored in Zustand. This hook watches for authentication
 * completion, calls the server-side followUserByUsername mutation to
 * auto-follow the referrer's personal list, then navigates to the feed.
 */
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
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !pendingFollowUsername || hasProcessed.current) {
      return;
    }

    hasProcessed.current = true;
    let cancelled = false;

    const usernameToFollow = pendingFollowUsername;

    logDebug("Processing pending follow", {
      username: usernameToFollow,
    });

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

      if (!cancelled) {
        // Clear the pending follow BEFORE navigating so the effect cannot
        // re-trigger between the state update and the push.
        setPendingFollowUsername(null);
        router.push("/(tabs)/feed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    pendingFollowUsername,
    setPendingFollowUsername,
    router,
    convex,
  ]);

  // Reset the hasProcessed flag when pendingFollowUsername changes
  useEffect(() => {
    if (pendingFollowUsername) {
      hasProcessed.current = false;
    }
  }, [pendingFollowUsername]);
}
