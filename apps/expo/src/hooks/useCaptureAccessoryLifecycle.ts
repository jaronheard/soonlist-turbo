import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { SUPPORTS_LIQUID_GLASS } from "~/hooks/useLiquidGlass";
import { useInFlightEventStore } from "~/store/useInFlightEventStore";

// How long to keep a finished batch visible in the accessory before
// auto-dismissing it. Long enough to tap in from another tab, short
// enough that the accessory doesn't linger into the next session.
const AUTO_DISMISS_MS = 5 * 60 * 1000;

// Safety net for batches that never reach a terminal state — e.g. a
// local preprocessing error leaves some images un-queued so the backend
// progress can't advance to 100%. After this much wall-clock time from
// start, we assume the batch is stuck and clear the accessory so it
// doesn't sit on "Capturing…" indefinitely.
const MAX_PROCESSING_MS = 10 * 60 * 1000;

/**
 * useCaptureAccessoryLifecycle
 * ----------------------------
 * Observes the batch tracked by the iOS 26 tab bar bottom accessory and:
 *   1. Marks it completed the first time the backend reports
 *      "completed" or "failed" (so the accessory can flip from the
 *      "capturing…" UI to the "captured" UI).
 *   2. Auto-dismisses the accessory 5 minutes after completion.
 *   3. Force-dismisses stuck batches after MAX_PROCESSING_MS to recover
 *      from local preprocessing failures that leave the backend unable
 *      to reach a terminal state on its own.
 *
 * Mounted once at the root, not inside the accessory itself — the
 * accessory renders two instances (regular + inline placements) and
 * anything stateful must live outside of it.
 */
export function useCaptureAccessoryLifecycle() {
  const accessoryBatchId = useInFlightEventStore((s) => s.accessoryBatchId);
  const accessoryStartedAt = useInFlightEventStore((s) => s.accessoryStartedAt);
  const accessoryCompletedAt = useInFlightEventStore(
    (s) => s.accessoryCompletedAt,
  );
  const markCompleted = useInFlightEventStore((s) => s.markAccessoryCompleted);
  const dismiss = useInFlightEventStore((s) => s.dismissAccessoryBatch);

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

  // Force-dismiss batches that have been "processing" too long. Covers
  // the case where useCreateEvent threw before all images were queued
  // (so the backend's progress can't reach 100%) — we never dismiss in
  // those catch blocks to avoid wiping partial-success state, so this
  // is the single safety net.
  const stuckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (stuckTimerRef.current) {
      clearTimeout(stuckTimerRef.current);
      stuckTimerRef.current = null;
    }
    if (!accessoryBatchId || !accessoryStartedAt || accessoryCompletedAt) {
      return;
    }
    const remaining = MAX_PROCESSING_MS - (Date.now() - accessoryStartedAt);
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
  }, [accessoryBatchId, accessoryStartedAt, accessoryCompletedAt, dismiss]);
}
