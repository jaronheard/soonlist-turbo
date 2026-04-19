import { useEffect, useRef } from "react";
import { usePostHog } from "posthog-react-native";
import { shallow } from "zustand/shallow";

import { useHasSeenShareListPrompt, useSetShareListPromptSeen } from "~/store";
import { useInFlightEventStore } from "~/store/useInFlightEventStore";

const THRESHOLD = 3;

/**
 * Hook that gates proactive Soon List share prompts on having at least
 * THRESHOLD upcoming events. Mirrors useRatingPrompt in spirit but exposes
 * state (rather than firing directly) so the feed screen can mount a custom
 * bottom sheet.
 *
 * - `isShareEligible` reflects the current count (reactive; can flip back).
 * - `shouldShowOneShot` is true when we should show the one-shot sheet now
 *   (eligible, not yet seen, no batch mid-flight).
 * - `markOneShotSeen` persists the dismissal.
 */
export function useShareListPrompt(upcomingEventCount: number) {
  const hasSeen = useHasSeenShareListPrompt();
  const markSeen = useSetShareListPromptSeen();
  const posthog = usePostHog();
  const pendingBatchIds = useInFlightEventStore(
    (s) => s.pendingBatchIds,
    shallow,
  );

  const isShareEligible = upcomingEventCount >= THRESHOLD;
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

  const shouldShowOneShot = isShareEligible && !hasSeen && !isBatchInFlight;

  return {
    isShareEligible,
    shouldShowOneShot,
    markOneShotSeen: markSeen,
  };
}
