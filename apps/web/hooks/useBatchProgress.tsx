"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { toast } from "sonner";

import { api } from "@soonlist/backend/convex/_generated/api";

interface UseBatchProgressOptions {
  batchId: string | null;
}

interface BatchStatusResult {
  batchId: string;
  status: "processing" | "completed" | "failed";
  totalCount: number;
  successCount: number;
  failureCount: number;
  progress: number;
}

interface BatchPromiseCallbacks {
  resolve: (value: BatchStatusResult) => void;
  reject: (reason: Error) => void;
}

// Extend window interface to include our custom property
declare global {
  interface Window {
    __batchPromiseCallbacks?: Record<string, BatchPromiseCallbacks>;
  }
}

/**
 * Hook to track batch upload progress with toast.promise
 * Uses a single toast that transitions from loading → success/error
 */
export function useBatchProgress({ batchId }: UseBatchProgressOptions): void {
  const hasShownToastRef = useRef(false);
  const batchIdRef = useRef<string | null>(null);

  // Use Convex query to reactively track batch status
  const batchStatus = useQuery(
    api.eventBatches.getBatchStatus,
    batchId ? { batchId } : "skip",
  );

  useEffect(() => {
    // Only show toast once per batch
    if (!batchId || !batchStatus || hasShownToastRef.current) return;

    // Only start the toast when we first detect a processing batch
    if (batchStatus.status === "processing" && batchIdRef.current !== batchId) {
      batchIdRef.current = batchId;
      hasShownToastRef.current = true;

      // Create a Promise that resolves when the batch is complete
      const batchPromise = new Promise<BatchStatusResult>((resolve, reject) => {
        // Store resolve/reject in a way the effect can access them
        if (!window.__batchPromiseCallbacks) {
          window.__batchPromiseCallbacks = {};
        }
        window.__batchPromiseCallbacks[batchId] = { resolve, reject };
      });

      // Use toast.promise for automatic state transitions
      toast.promise(batchPromise, {
        loading: `Capturing ${batchStatus.totalCount} ${batchStatus.totalCount === 1 ? "event" : "events"}...`,
        success: (data) => {
          const hasErrors = data.failureCount > 0;
          if (hasErrors) {
            return `${data.successCount} out of ${data.totalCount} ${data.totalCount === 1 ? "event" : "events"} captured successfully`;
          }
          return `${data.successCount} ${data.successCount === 1 ? "event" : "events"} captured successfully`;
        },
        error: "Failed to capture events",
        duration: 4000,
      });
    }

    // Resolve the promise when batch completes
    if (batchStatus.status === "completed" || batchStatus.status === "failed") {
      const callbacks = window.__batchPromiseCallbacks?.[batchId];
      if (callbacks) {
        if (
          batchStatus.status === "completed" ||
          batchStatus.successCount > 0
        ) {
          callbacks.resolve(batchStatus);
        } else {
          callbacks.reject(new Error("Batch processing failed"));
        }
        if (window.__batchPromiseCallbacks) {
          delete window.__batchPromiseCallbacks[batchId];
        }
      }
    }
  }, [batchId, batchStatus]);

  // Cleanup: reset state when batchId changes
  useEffect(() => {
    return () => {
      hasShownToastRef.current = false;
      batchIdRef.current = null;

      // Clean up any pending promise callbacks
      if (batchId && window.__batchPromiseCallbacks?.[batchId]) {
        delete window.__batchPromiseCallbacks[batchId];
      }
    };
  }, [batchId]);
}
