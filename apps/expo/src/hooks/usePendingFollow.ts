import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useConvexAuth } from "convex/react";

import { useAppStore } from "~/store";
import { logDebug } from "~/utils/errorLogging";

/**
 * Hook to process pending follow intents after user authentication
 *
 * When a user clicks a follow link from the web but isn't authenticated,
 * the username is stored in Zustand. This hook watches for authentication
 * completion and navigates to the user's profile to complete the follow action.
 *
 * The actual follow mutation is not called here - instead, we navigate to the
 * profile page where the user can see the profile and tap the follow button.
 * This gives them agency over the follow action after seeing the profile.
 */
export function usePendingFollow() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const pendingFollowUsername = useAppStore(
    (state) => state.pendingFollowUsername,
  );
  const setPendingFollowUsername = useAppStore(
    (state) => state.setPendingFollowUsername,
  );
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Only process if:
    // 1. User is authenticated
    // 2. There's a pending follow username
    // 3. We haven't already processed this
    if (
      isAuthenticated &&
      pendingFollowUsername &&
      !hasProcessed.current
    ) {
      hasProcessed.current = true;

      logDebug("Processing pending follow", {
        username: pendingFollowUsername,
      });

      // Clear the pending follow immediately to prevent re-processing
      const usernameToFollow = pendingFollowUsername;
      setPendingFollowUsername(null);

      // Navigate to the user's profile after a short delay
      // This allows the auth flow to complete fully before navigation
      setTimeout(() => {
        router.push(`/${usernameToFollow}`);
      }, 500);
    }
  }, [isAuthenticated, pendingFollowUsername, setPendingFollowUsername, router]);

  // Reset the hasProcessed flag when pendingFollowUsername changes
  // This allows processing a new pending follow if one is set
  useEffect(() => {
    if (pendingFollowUsername) {
      hasProcessed.current = false;
    }
  }, [pendingFollowUsername]);
}
