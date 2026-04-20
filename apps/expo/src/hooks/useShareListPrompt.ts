import { useEffect, useRef } from "react";
import { usePostHog } from "posthog-react-native";
import { shallow } from "zustand/shallow";

import {
  useHasSeenShareListPrompt,
  useHasShownRatingPrompt,
  useSetShareListPromptSeen,
} from "~/store";
import { useInFlightEventStore } from "~/store/useInFlightEventStore";

export const SHARE_PROMPT_THRESHOLD = 3;

/**
 * Gates proactive Soonlist share prompts on upcoming-event count.
 * Returns state rather than firing directly, so the feed screen can mount
 * its own UI on top of the one-shot signal.
 */
export function useShareListPrompt(upcomingEventCount: number) {
  const hasSeen = useHasSeenShareListPrompt();
  const markSeen = useSetShareListPromptSeen();
  const hasShownRatingPrompt = useHasShownRatingPrompt();
  const posthog = usePostHog();
  const pendingBatchIds = useInFlightEventStore(
    (s) => s.pendingBatchIds,
    shallow,
  );

  const isShareEligible = upcomingEventCount >= SHARE_PROMPT_THRESHOLD;
  const isBatchInFlight = pendingBatchIds.length > 0;

  const wasEligibleRef = useRef(isShareEligible);
  useEffect(() => {
    if (!wasEligibleRef.current && isShareEligible && !hasSeen) {
      posthog.capture("share_prompt_eligibility_crossed", {
        upcomingEventCount,
      });
    }
    wasEligibleRef.current = isShareEligible;
  }, [isShareEligible, hasSeen, posthog, upcomingEventCount]);

  const pillImpressionRef = useRef(false);
  useEffect(() => {
    if (isShareEligible && !pillImpressionRef.current) {
      pillImpressionRef.current = true;
      posthog.capture("share_prompt_pill_impression", {
        upcomingEventCount,
      });
    }
    if (!isShareEligible) {
      pillImpressionRef.current = false;
    }
  }, [isShareEligible, posthog, upcomingEventCount]);

  // Defer until the rating prompt has already fired so the two one-shot
  // prompts don't stack on the same threshold crossing. On fresh logins
  // both flags reset; rating fires at 1000ms, share follows on the next
  // state update once its flag is set.
  const shouldShowOneShot =
    isShareEligible && !hasSeen && !isBatchInFlight && hasShownRatingPrompt;

  return {
    isShareEligible,
    shouldShowOneShot,
    markOneShotSeen: markSeen,
  };
}
