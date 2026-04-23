import { useCallback, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { shallow } from "zustand/shallow";

import { api } from "@soonlist/backend/convex/_generated/api";

import { showBatchSummaryBanner } from "~/components/BatchSummaryBanner";
import { showEventCaptureBanner } from "~/components/EventCaptureBanner";
import { useInFlightEventStore } from "~/store/useInFlightEventStore";

export function useCaptureCompletionFeedback() {
  const pendingBatchIds = useInFlightEventStore(
    (s) => s.pendingBatchIds,
    shallow,
  );
  const removePendingBatchId = useInFlightEventStore(
    (s) => s.removePendingBatchId,
  );

  const shownBatchIds = useRef<Set<string>>(new Set());

  const currentBatchId = pendingBatchIds[0];

  const batchStatus = useQuery(
    api.eventBatches.getBatchStatus,
    currentBatchId ? { batchId: currentBatchId } : "skip",
  );

  const showFeedback = useCallback(() => {
    if (!batchStatus || !currentBatchId) return;

    if (batchStatus.status !== "completed" && batchStatus.status !== "failed") {
      return;
    }

    if (shownBatchIds.current.has(currentBatchId)) {
      return;
    }

    shownBatchIds.current.add(currentBatchId);

    removePendingBatchId(currentBatchId);

    if (batchStatus.totalCount <= 1 && batchStatus.events.length > 0) {
      const event = batchStatus.events[0];
      if (event) {
        showEventCaptureBanner({
          eventId: event.id,
          notificationContent: event.notificationContent,
        });
      }
    } else if (batchStatus.batchSummaryContent) {
      showBatchSummaryBanner({
        batchId: currentBatchId,
        notificationContent: batchStatus.batchSummaryContent,
      });
    } else if (batchStatus.failureCount > 0 && batchStatus.successCount === 0) {
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

  useEffect(() => {
    showFeedback();
  }, [showFeedback]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (shownBatchIds.current.size > 100) {
        shownBatchIds.current.clear();
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);
}
