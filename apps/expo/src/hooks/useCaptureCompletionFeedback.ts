import { useCallback, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { shallow } from "zustand/shallow";

import { api } from "@soonlist/backend/convex/_generated/api";

import { showBatchSummaryBanner } from "~/components/BatchSummaryBanner";
import { showEventCaptureBanner } from "~/components/EventCaptureBanner";
import { useInFlightEventStore } from "~/store/useInFlightEventStore";

/**
 * Hook that monitors pending batches and shows completion feedback
 * for users who don't have push notification permission.
 *
 * This provides the same quality feedback as push notifications:
 * - 1 event: Individual EventCaptureBanner with notification content
 * - 2+ events: Single BatchSummaryBanner with batch summary content
 */
export function useCaptureCompletionFeedback() {
  const pendingBatchIds = useInFlightEventStore(
    (s) => s.pendingBatchIds,
    shallow,
  );
  const removePendingBatchId = useInFlightEventStore(
    (s) => s.removePendingBatchId,
  );

  // Track which batches we've already shown feedback for
  const shownBatchIds = useRef<Set<string>>(new Set());

  // Get the first pending batch ID to monitor
  // We process one at a time to avoid overwhelming the user
  const currentBatchId = pendingBatchIds[0];

  // Subscribe to batch status for the current batch
  const batchStatus = useQuery(
    api.eventBatches.getBatchStatus,
    currentBatchId ? { batchId: currentBatchId } : "skip",
  );

  const showFeedback = useCallback(() => {
    if (!batchStatus || !currentBatchId) return;

    // Only show feedback when batch is completed or failed
    if (batchStatus.status !== "completed" && batchStatus.status !== "failed") {
      return;
    }

    // Don't show feedback twice for the same batch
    if (shownBatchIds.current.has(currentBatchId)) {
      return;
    }

    // Mark as shown
    shownBatchIds.current.add(currentBatchId);

    // Remove from pending (triggers next batch to be monitored)
    removePendingBatchId(currentBatchId);

    // Determine which type of feedback to show
    if (batchStatus.totalCount <= 1 && batchStatus.events.length > 0) {
      // Show individual banner for single event
      const event = batchStatus.events[0];
      if (event) {
        showEventCaptureBanner({
          eventId: event.id,
          notificationContent: event.notificationContent,
        });
      }
    } else if (batchStatus.batchSummaryContent) {
      // Show batch summary banner for 2+ events
      showBatchSummaryBanner({
        batchId: currentBatchId,
        notificationContent: batchStatus.batchSummaryContent,
      });
    } else if (batchStatus.failureCount > 0 && batchStatus.successCount === 0) {
      // All events failed - show error summary
      showBatchSummaryBanner({
        batchId: currentBatchId,
        notificationContent: {
          title: "Event capture failed",
          subtitle: `${batchStatus.failureCount} image${batchStatus.failureCount > 1 ? "s" : ""} failed to process`,
          body: "Please try again",
        },
      });
    }
  }, [batchStatus, currentBatchId, removePendingBatchId]);

  // Show feedback when batch completes
  useEffect(() => {
    showFeedback();
  }, [showFeedback]);

  // Clean up old entries from shownBatchIds after 1 minute
  useEffect(() => {
    const interval = setInterval(() => {
      // Only keep recent entries (this prevents memory leaks)
      if (shownBatchIds.current.size > 100) {
        shownBatchIds.current.clear();
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);
}
