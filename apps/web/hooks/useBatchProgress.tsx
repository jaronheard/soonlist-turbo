"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@soonlist/backend/convex/_generated/api";

import { PENDING_BATCH_ID_KEY } from "~/lib/batchUtils";

interface UseBatchProgressOptions {
  batchId: string | null;
}

/**
 * Hook to track batch upload progress with updating toast
 * Updates the same toast from loading to success/error state
 */
export function useBatchProgress({ batchId }: UseBatchProgressOptions): void {
  const router = useRouter();
  const toastIdRef = useRef<string | number | null>(null);
  const hasShownCompletionRef = useRef(false);

  // Use Convex query to reactively track batch status
  const batchStatus = useQuery(
    api.eventBatches.getBatchStatus,
    batchId ? { batchId } : "skip",
  );

  useEffect(() => {
    if (!batchStatus) return;

    // Show initial loading toast
    if (batchStatus.status === "processing" && !toastIdRef.current) {
      toastIdRef.current = toast.loading(
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="font-medium">
            Capturing {batchStatus.totalCount}{" "}
            {batchStatus.totalCount === 1 ? "event" : "events"}...
          </span>
        </div>,
        {
          duration: Infinity,
        },
      );
    }

    // Update the same toast when completed/failed (or create a new one if no loading toast exists)
    if (
      (batchStatus.status === "completed" || batchStatus.status === "failed") &&
      !hasShownCompletionRef.current
    ) {
      hasShownCompletionRef.current = true;

      // Clear persisted batchId since the batch is done
      try {
        sessionStorage.removeItem(PENDING_BATCH_ID_KEY);
      } catch {
        // sessionStorage may not be available
      }

      const hasErrors = batchStatus.failureCount > 0;

      if (hasErrors) {
        const successCount = batchStatus.successCount;
        const totalCount = batchStatus.totalCount;
        toast.error(
          `${successCount} out of ${totalCount} ${totalCount === 1 ? "event" : "events"} captured successfully`,
          {
            id: toastIdRef.current ?? undefined,
            duration: 6000,
          },
        );
      } else {
        const isSingleEvent = batchStatus.successCount === 1;
        const message = isSingleEvent
          ? "Event captured successfully"
          : `${batchStatus.successCount} events captured successfully`;

        toast.success(message, {
          id: toastIdRef.current ?? undefined,
          duration: 4000,
          action:
            isSingleEvent && batchStatus.firstEventId
              ? {
                  label: "View event",
                  onClick: () =>
                    router.push(`/event/${batchStatus.firstEventId}`),
                }
              : undefined,
        });
      }

      // Clear the ref since the toast is now handled
      toastIdRef.current = null;
    }
  }, [batchStatus]);

  // Cleanup: dismiss toast when component unmounts or batchId changes,
  // but NOT during cross-layout navigation (when a pending batch is in sessionStorage)
  useEffect(() => {
    return () => {
      let hasPendingBatch = false;
      try {
        hasPendingBatch = !!sessionStorage.getItem(PENDING_BATCH_ID_KEY);
      } catch {
        // sessionStorage may not be available
      }

      if (toastIdRef.current && !hasPendingBatch) {
        toast.dismiss(toastIdRef.current);
      }
      toastIdRef.current = null;
      hasShownCompletionRef.current = false;
    };
  }, [batchId]);
}
