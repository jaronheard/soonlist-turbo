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
    let cancelled = false;

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

    // Returning user: preserve today's auto-follow + feed-nav flow.
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
}
