import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { SUPPORTS_LIQUID_GLASS } from "~/hooks/useLiquidGlass";
import { useInFlightEventStore } from "~/store/useInFlightEventStore";

// How long to keep a finished batch visible in the accessory before
// auto-dismissing it. Long enough to tap in from another tab, short
// enough that the accessory doesn't linger into the next session.
const AUTO_DISMISS_MS = 5 * 60 * 1000;

/**
 * useCaptureAccessoryLifecycle
 * ----------------------------
 * Observes the batch tracked by the iOS 26 tab bar bottom accessory and:
 *   1. Marks it completed the first time the backend reports
 *      "completed" or "failed" (so the accessory can flip from the
 *      "capturing…" UI to the "captured" UI).
 *   2. Auto-dismisses the accessory 5 minutes after completion.
 *
 * Mounted once at the root, not inside the accessory itself — the
 * accessory renders two instances (regular + inline placements) and
 * anything stateful must live outside of it.
 */
export function useCaptureAccessoryLifecycle() {
  const accessoryBatchId = useInFlightEventStore((s) => s.accessoryBatchId);
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!accessoryBatchId || !accessoryCompletedAt) return;
    const remaining = AUTO_DISMISS_MS - (Date.now() - accessoryCompletedAt);
    if (remaining <= 0) {
      dismiss();
      return;
    }
    timerRef.current = setTimeout(() => {
      dismiss();
    }, remaining);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [accessoryBatchId, accessoryCompletedAt, dismiss]);
}
