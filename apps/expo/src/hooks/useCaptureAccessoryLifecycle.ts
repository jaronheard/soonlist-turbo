import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { SUPPORTS_LIQUID_GLASS } from "~/hooks/useLiquidGlass";
import { useAppStore } from "~/store";

// How long to keep a finished batch visible in the accessory before
// auto-dismissing it. Long enough to tap in from another tab, short
// enough that the accessory doesn't linger into the next session.
const AUTO_DISMISS_MS = 5 * 60 * 1000;

// Safety net for batches that never reach a terminal state because
// local preprocessing failed before any image was queued (backend sees
// 0 / totalCount and can't advance). We only apply this when the
// backend shows ZERO progress — a healthy long-running batch will have
// already registered some success/failure, so we trust the backend to
// terminate on its own rather than force-dismissing.
const NO_PROGRESS_STUCK_MS = 10 * 60 * 1000;

/**
 * useCaptureAccessoryLifecycle
 * ----------------------------
 * Observes the batch tracked by the iOS 26 tab bar bottom accessory and:
 *   1. Marks it completed the first time the backend reports
 *      "completed" or "failed" (so the accessory can flip from the
 *      "capturing…" UI to the "captured" UI).
 *   2. Auto-dismisses the accessory 5 minutes after completion.
 *   3. Force-dismisses stuck batches (no backend progress after
 *      NO_PROGRESS_STUCK_MS) to recover from local preprocessing
 *      failures that leave the backend unable to reach a terminal state
 *      on its own. Healthy long-running batches — any success/failure
 *      registered — are left alone so we don't dismiss prematurely.
 *
 * Mounted once at the root, not inside the accessory itself — the
 * accessory renders two instances (regular + inline placements) and
 * anything stateful must live outside of it.
 */
export function useCaptureAccessoryLifecycle() {
  const accessoryBatchId = useAppStore((s) => s.accessoryBatchId);
  const accessoryStartedAt = useAppStore((s) => s.accessoryStartedAt);
  const accessoryCompletedAt = useAppStore((s) => s.accessoryCompletedAt);
  const markCompleted = useAppStore((s) => s.markAccessoryCompleted);
  const dismiss = useAppStore((s) => s.dismissAccessoryBatch);

  // Defense in depth: the accessory only renders on iOS 26+, and
  // useCreateEvent already gates `setAccessoryBatch` on this flag, but
  // skipping here keeps the Convex subscription off on older OS versions
  // even if a batch id ever leaks into the store from another code path.
  const batchStatus = useQuery(
    api.eventBatches.getBatchStatus,
    SUPPORTS_LIQUID_GLASS && accessoryBatchId
      ? { batchId: accessoryBatchId }
      : "skip",
  );

  // Mark completion the first time the backend reports a terminal state.
  useEffect(() => {
    if (!accessoryBatchId || accessoryCompletedAt) return;
    if (!batchStatus) return;
    if (batchStatus.status === "completed" || batchStatus.status === "failed") {
      markCompleted();
    }
  }, [batchStatus, accessoryBatchId, accessoryCompletedAt, markCompleted]);

  // Auto-dismiss the accessory some time after completion.
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (!accessoryBatchId || !accessoryCompletedAt) return;
    const remaining = AUTO_DISMISS_MS - (Date.now() - accessoryCompletedAt);
    if (remaining <= 0) {
      dismiss();
      return;
    }
    dismissTimerRef.current = setTimeout(() => {
      dismiss();
    }, remaining);
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [accessoryBatchId, accessoryCompletedAt, dismiss]);

  // Force-dismiss batches that the backend clearly can't finish: no
  // progress (0 successes, 0 failures) after NO_PROGRESS_STUCK_MS. This
  // is the recovery path when useCreateEvent threw before any image
  // reached the backend. Batches with any registered progress are left
  // alone — a large batch can legitimately take a long time, and we'd
  // rather leave it than dismiss a healthy capture.
  const stuckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasBackendProgress = batchStatus
    ? batchStatus.successCount + batchStatus.failureCount > 0
    : false;
  useEffect(() => {
    if (stuckTimerRef.current) {
      clearTimeout(stuckTimerRef.current);
      stuckTimerRef.current = null;
    }
    if (!accessoryBatchId || !accessoryStartedAt || accessoryCompletedAt) {
      return;
    }
    if (hasBackendProgress) return;
    const remaining = NO_PROGRESS_STUCK_MS - (Date.now() - accessoryStartedAt);
    if (remaining <= 0) {
      dismiss();
      return;
    }
    stuckTimerRef.current = setTimeout(() => {
      dismiss();
    }, remaining);
    return () => {
      if (stuckTimerRef.current) {
        clearTimeout(stuckTimerRef.current);
        stuckTimerRef.current = null;
      }
    };
  }, [
    accessoryBatchId,
    accessoryStartedAt,
    accessoryCompletedAt,
    hasBackendProgress,
    dismiss,
  ]);
}
