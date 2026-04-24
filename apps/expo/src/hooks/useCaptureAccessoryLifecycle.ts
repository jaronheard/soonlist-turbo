import type { AppStateStatus } from "react-native";
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { SUPPORTS_LIQUID_GLASS } from "~/hooks/useLiquidGlass";
import { useAppStore } from "~/store";

// How long to keep a finished batch visible in the accessory before
// auto-dismissing it. Long enough to tap in from another tab, short
// enough that the accessory doesn't linger into the next session.
const AUTO_DISMISS_MS = 5 * 60 * 1000;

// Safety net for batches whose backend progress stalls (never
// advances to totalCount). Two real-world cases: (1) useCreateEvent
// threw before any image reached the backend, so progress stays at
// 0 / N forever; (2) Promise.all in createMultipleEvents rejected
// part-way, so progress parks at M / N with M < N. We measure
// staleness from the last observed progress change, so healthy
// long-running captures (which keep advancing) are never dismissed
// prematurely, but both stuck cases clear after the same deadline.
const NO_PROGRESS_STUCK_MS = 10 * 60 * 1000;

/**
 * useCaptureAccessoryLifecycle
 * ----------------------------
 * Observes the batch tracked by the iOS 26 tab bar bottom accessory and:
 *   1. Marks it completed the first time the backend reports
 *      "completed" or "failed" (so the accessory can flip from the
 *      "capturing…" UI to the "captured" UI).
 *   2. Auto-dismisses the accessory 5 minutes after completion.
 *   3. Force-dismisses stuck batches (no backend progress change for
 *      NO_PROGRESS_STUCK_MS) to recover from local preprocessing
 *      failures that leave the backend unable to reach a terminal
 *      state on its own. Tracks "time since last progress" — healthy
 *      long-running batches keep advancing so they're never dismissed,
 *      while both 0-of-N and partial-of-N stalls eventually clear.
 *
 * Mounted once at the root, not inside the accessory itself — the
 * accessory renders two instances (regular + inline placements) and
 * anything stateful must live outside of it.
 */
export function useCaptureAccessoryLifecycle() {
  const accessoryBatchId = useAppStore((s) => s.accessoryBatchId);
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

  // Track the last moment the backend reported a change in progress.
  // `null` means "no response yet" — in that state we don't run the
  // stuck timer (would dismiss a healthy batch whose subscription just
  // hasn't warmed up). The first response (even 0/N) seeds the clock;
  // subsequent progress changes reset it.
  const [lastProgressAt, setLastProgressAt] = useState<number | null>(null);
  const observedProgressRef = useRef<number | null>(null);

  // Reset progress observation whenever we switch to a new batch.
  useEffect(() => {
    observedProgressRef.current = null;
    setLastProgressAt(null);
  }, [accessoryBatchId]);

  const progressCount = batchStatus
    ? batchStatus.successCount + batchStatus.failureCount
    : null;
  useEffect(() => {
    if (progressCount === null) return;
    if (observedProgressRef.current === progressCount) return;
    observedProgressRef.current = progressCount;
    setLastProgressAt(Date.now());
  }, [progressCount]);

  // Convex subscriptions pause while the app is backgrounded or offline,
  // so `lastProgressAt` can appear stale through no fault of the batch.
  // Give the subscription a fresh window only when we've regained BOTH
  // an active foreground state AND network connectivity — bumping on
  // just one side would reset the timer while Convex is still paused.
  // If the batch really is stuck, the timer will fire once we've been
  // continuously active+online for NO_PROGRESS_STUCK_MS without new
  // progress.
  useEffect(() => {
    if (!accessoryBatchId || accessoryCompletedAt) return;
    let currentAppState: AppStateStatus = AppState.currentState;
    let isConnected = true;
    const maybeBumpTimer = () => {
      if (
        currentAppState === "active" &&
        isConnected &&
        useAppStore.getState().accessoryBatchId
      ) {
        setLastProgressAt(Date.now());
      }
    };
    // Seed connectivity from NetInfo so the first AppState change can
    // make a decision without waiting for a network event.
    void NetInfo.fetch()
      .then((state) => {
        isConnected = state.isConnected === true;
      })
      .catch(() => {
        /* keep the optimistic default */
      });
    const appStateSub = AppState.addEventListener("change", (state) => {
      currentAppState = state;
      maybeBumpTimer();
    });
    const netUnsub = NetInfo.addEventListener((state) => {
      isConnected = state.isConnected === true;
      maybeBumpTimer();
    });
    return () => {
      appStateSub.remove();
      netUnsub();
    };
  }, [accessoryBatchId, accessoryCompletedAt]);

  // Force-dismiss batches whose backend progress has gone stale.
  // Covers both "never made it to the backend" and "Promise.all
  // rejected partway" — the timer is measured from the last observed
  // progress change, so a healthy batch that keeps advancing resets
  // it on every tick and is never dismissed.
  const stuckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (stuckTimerRef.current) {
      clearTimeout(stuckTimerRef.current);
      stuckTimerRef.current = null;
    }
    if (!accessoryBatchId || accessoryCompletedAt || !lastProgressAt) return;
    const remaining = NO_PROGRESS_STUCK_MS - (Date.now() - lastProgressAt);
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
  }, [accessoryBatchId, accessoryCompletedAt, lastProgressAt, dismiss]);
}
