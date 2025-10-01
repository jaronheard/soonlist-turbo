"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { toast } from "sonner";

import { api } from "@soonlist/backend/convex/_generated/api";

interface UseBatchProgressOptions {
  batchId: string | null;
  onComplete?: (successCount: number, failureCount: number) => void;
}

interface BatchProgress {
  batchId: string;
  status: "processing" | "completed" | "failed";
  totalCount: number;
  successCount: number;
  failureCount: number;
  progress: number;
}

/**
 * Hook to track batch upload progress in real-time
 * Uses Convex reactive queries to automatically update when backend changes
 */
export function useBatchProgress({
  batchId,
  onComplete,
}: UseBatchProgressOptions): BatchProgress | null {
  const [hasShownCompletion, setHasShownCompletion] = useState(false);
  const previousProgressRef = useRef<number>(0);

  // Use Convex query to reactively track batch status
  // This will automatically update when the backend updates the batch
  const batchStatus = useQuery(
    api.eventBatches.getBatchStatus,
    batchId ? { batchId } : "skip",
  );

  // Show toast notifications when progress changes
  useEffect(() => {
    if (!batchStatus) return;

    const currentProgress = batchStatus.progress;
    const previousProgress = previousProgressRef.current;

    // Update the ref for next comparison
    previousProgressRef.current = currentProgress;

    // Don't show initial progress toast
    if (previousProgress === 0 && currentProgress > 0) {
      return;
    }

    // Show completion toast
    if (
      batchStatus.status === "completed" &&
      !hasShownCompletion &&
      currentProgress === 100
    ) {
      setHasShownCompletion(true);

      const hasErrors = batchStatus.failureCount > 0;

      if (hasErrors) {
        toast.error(
          `Batch complete: ${batchStatus.successCount} succeeded, ${batchStatus.failureCount} failed`,
          {
            duration: 5000,
          },
        );
      } else {
        toast.success(
          `✨ Successfully created ${batchStatus.successCount} ${batchStatus.successCount === 1 ? "event" : "events"}!`,
          {
            duration: 4000,
          },
        );
      }

      onComplete?.(batchStatus.successCount, batchStatus.failureCount);
    }
  }, [batchStatus, hasShownCompletion, onComplete]);

  // Reset completion flag when batchId changes
  useEffect(() => {
    setHasShownCompletion(false);
    previousProgressRef.current = 0;
  }, [batchId]);

  return batchStatus ?? null;
}

