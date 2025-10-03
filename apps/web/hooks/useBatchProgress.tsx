"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@soonlist/backend/convex/_generated/api";

interface UseBatchProgressOptions {
  batchId: string | null;
}

/**
 * Hook to track batch upload progress with updating toast
 * Updates the same toast from loading to success/error state
 */
export function useBatchProgress({ batchId }: UseBatchProgressOptions): void {
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
        toast.success(
          `${batchStatus.successCount} ${batchStatus.successCount === 1 ? "event" : "events"} captured successfully`,
          {
            id: toastIdRef.current ?? undefined,
            duration: 4000,
          },
        );
      }

      // Clear the ref since the toast is now handled
      toastIdRef.current = null;
    }
  }, [batchStatus]);

  // Cleanup: dismiss toast when component unmounts or batchId changes
  useEffect(() => {
    return () => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
      hasShownCompletionRef.current = false;
    };
  }, [batchId]);
}
