import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useConvex, useConvexAuth, useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { useAppStore } from "~/store";
import { logDebug } from "~/utils/errorLogging";

/**
 * Hook to process pending follow intents after user authentication.
 *
 * Behavior branches on whether the signed-in user already follows any lists:
 * - **Returning user (has follows):** auto-call `followUserByUsername`, clear
 *   `pendingFollowUsername`, and navigate to the feed. Preserves the legacy
 *   invisible flow so a returning user clicking a new share link isn't
 *   stranded on an empty-state screen they've already moved past.
 * - **New user (no follows yet):** do NOT auto-follow and do NOT clear the
 *   pending username. Route to `/(tabs)/following` so the new
 *   `ReferralEmptyState` can render the hero and an explicit Subscribe CTA.
 *
 * Tracks the *last processed username* rather than a boolean flag so that
 * reactive re-emissions of `followedLists` (which is in the effect's deps so
 * the returning-user branch can read it) can't re-enter processing for a
 * pending value we've already handled. A new pending username is reprocessed
 * naturally because it won't match `lastProcessed`.
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
  const followedLists = useQuery(
    api.lists.getFollowedLists,
    isAuthenticated ? {} : "skip",
  );
  const lastProcessedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !pendingFollowUsername) {
      return;
    }

    // Wait for the followed-lists query to resolve before deciding which
    // branch to take — otherwise we may miss the returning-user optimization.
    if (followedLists === undefined) {
      return;
    }

    // Skip if we've already processed this exact pending username. A new
    // username (user clicked a different share link) won't match and will be
    // processed fresh.
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
      // New user: let ReferralEmptyState render on the Following tab. Leave
      // `pendingFollowUsername` set; the explicit Subscribe tap clears it.
      router.push("/(tabs)/following");
      return;
    }

    // Returning user: preserve today's auto-follow + feed-nav flow. No
    // `cancelled` guard — `lastProcessedRef` already blocks re-entry on
    // dep re-emits, so cancelling the in-flight flow would leave the user
    // stranded with a persisted pending referral and no feed navigation.
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

      // Only finalize if we're still the active processing run. A newer
      // referral that arrived mid-mutation would have advanced
      // `lastProcessedRef`; clobbering its pending/navigation here would
      // cancel that newer intent before its own flow completes.
      if (lastProcessedRef.current !== usernameToFollow) {
        return;
      }

      // Clear pending BEFORE navigating so the state update doesn't
      // re-trigger the effect between the push and the clear.
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

  // Reset when auth drops so a re-authenticated user in the same app session
  // can still have their persisted pending referral processed. Without this,
  // a new user who routes to /(tabs)/following, then signs out and signs back
  // in, would be stranded because `lastProcessedRef` still matches.
  useEffect(() => {
    if (!isAuthenticated) {
      lastProcessedRef.current = null;
    }
  }, [isAuthenticated]);

  // Reset when pending is cleared so the SAME referral username can be
  // processed again later in the session (e.g. returning user auto-follows
  // "anise", pending is cleared, user clicks Anise's share link again).
  useEffect(() => {
    if (!pendingFollowUsername) {
      lastProcessedRef.current = null;
    }
  }, [pendingFollowUsername]);
}
