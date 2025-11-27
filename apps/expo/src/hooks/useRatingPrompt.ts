import { useEffect } from "react";
import * as StoreReview from "expo-store-review";

import { useHasShownRatingPrompt, useMarkRatingPromptShown } from "~/store";

/**
 * Hook to trigger rating prompt when user has 3+ upcoming events in their feed.
 * Only shows once per user (tracked by hasShownRatingPrompt).
 */
export function useRatingPrompt(upcomingEventCount: number) {
  const hasShownRatingPrompt = useHasShownRatingPrompt();
  const markRatingPromptShown = useMarkRatingPromptShown();

  useEffect(() => {
    if (hasShownRatingPrompt || upcomingEventCount < 3) return;

    const timer = setTimeout(() => {
      void (async () => {
        if (await StoreReview.hasAction()) {
          await StoreReview.requestReview();
        }
        markRatingPromptShown();
      })();
    }, 1000);

    return () => clearTimeout(timer);
  }, [upcomingEventCount, hasShownRatingPrompt, markRatingPromptShown]);
}
