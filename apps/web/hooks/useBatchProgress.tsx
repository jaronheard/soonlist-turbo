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
 * Hook to track batch upload progress with persistent toast
 * Shows a spinner while processing, then a completion message
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

    // Show persistent processing toast
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
          duration: Infinity, // Keep it until we dismiss it
        },
      );
    }

    // Show completion toast and dismiss the processing toast
    if (
      (batchStatus.status === "completed" || batchStatus.status === "failed") &&
      !hasShownCompletionRef.current
    ) {
      hasShownCompletionRef.current = true;

      // Dismiss the processing toast
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }

      // Show completion message
      const hasErrors = batchStatus.failureCount > 0;

      if (hasErrors) {
        const successCount = batchStatus.successCount;
        const totalCount = batchStatus.totalCount;
        toast.error(
          `${successCount} out of ${totalCount} ${totalCount === 1 ? "event" : "events"} captured successfully`,
          {
            duration: 6000, // Increased duration for error toasts
          },
        );
      } else {
        toast.success(
          `${batchStatus.successCount} ${batchStatus.successCount === 1 ? "event" : "events"} captured successfully`,
          {
            duration: 4000,
          },
        );
      }
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
