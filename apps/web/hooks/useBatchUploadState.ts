"use client";

import { useCallback, useState } from "react";

import type { BatchImage, BatchUploadState } from "~/lib/batchUtils";
import { createBatchState } from "~/lib/batchUtils";

interface UseBatchUploadStateReturn {
  batches: Map<string, BatchUploadState>;
  activeBatchId: string | null;
  createBatch: (batchId: string, images: BatchImage[]) => void;
  updateBatchStatus: (
    batchId: string,
    status: BatchUploadState["status"],
  ) => void;
  updateImageStatus: (
    batchId: string,
    tempId: string,
    status: "pending" | "processing" | "success" | "error",
    error?: string,
  ) => void;
  incrementProcessed: (batchId: string, success: boolean) => void;
  completeBatch: (batchId: string) => void;
  clearBatch: (batchId: string) => void;
  getActiveBatch: () => BatchUploadState | null;
}

export function useBatchUploadState(): UseBatchUploadStateReturn {
  const [batches, setBatches] = useState<Map<string, BatchUploadState>>(
    new Map(),
  );
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

  const createBatch = useCallback((batchId: string, images: BatchImage[]) => {
    const batchState = createBatchState(batchId, images);
    setBatches((prev) => {
      const next = new Map(prev);
      next.set(batchId, batchState);
      return next;
    });
    setActiveBatchId(batchId);
  }, []);

  const updateBatchStatus = useCallback(
    (batchId: string, status: BatchUploadState["status"]) => {
      setBatches((prev) => {
        const batch = prev.get(batchId);
        if (!batch) return prev;

        const next = new Map(prev);
        next.set(batchId, { ...batch, status });
        return next;
      });
    },
    [],
  );

  const updateImageStatus = useCallback(
    (
      batchId: string,
      tempId: string,
      status: "pending" | "processing" | "success" | "error",
      error?: string,
    ) => {
      setBatches((prev) => {
        const batch = prev.get(batchId);
        if (!batch) return prev;

        const imageIndex = batch.images.findIndex(
          (img) => img.tempId === tempId,
        );
        if (imageIndex === -1) return prev;

        const updatedImages = [...batch.images];
        updatedImages[imageIndex] = {
          ...updatedImages[imageIndex]!,
          status,
          error,
        };

        const next = new Map(prev);
        next.set(batchId, { ...batch, images: updatedImages });
        return next;
      });
    },
    [],
  );

  const incrementProcessed = useCallback(
    (batchId: string, success: boolean) => {
      setBatches((prev) => {
        const batch = prev.get(batchId);
        if (!batch) return prev;

        const next = new Map(prev);
        next.set(batchId, {
          ...batch,
          processedCount: batch.processedCount + 1,
          successCount: success ? batch.successCount + 1 : batch.successCount,
          errorCount: success ? batch.errorCount : batch.errorCount + 1,
        });
        return next;
      });
    },
    [],
  );

  const completeBatch = useCallback((batchId: string) => {
    setBatches((prev) => {
      const batch = prev.get(batchId);
      if (!batch) return prev;

      const next = new Map(prev);
      next.set(batchId, {
        ...batch,
        status: "complete",
        completedAt: Date.now(),
      });
      return next;
    });

    setActiveBatchId((current) => (current === batchId ? null : current));
  }, []);

  const clearBatch = useCallback((batchId: string) => {
    setBatches((prev) => {
      const next = new Map(prev);
      next.delete(batchId);
      return next;
    });

    setActiveBatchId((current) => (current === batchId ? null : current));
  }, []);

  const getActiveBatch = useCallback((): BatchUploadState | null => {
    if (!activeBatchId) return null;
    return batches.get(activeBatchId) ?? null;
  }, [activeBatchId, batches]);

  return {
    batches,
    activeBatchId,
    createBatch,
    updateBatchStatus,
    updateImageStatus,
    incrementProcessed,
    completeBatch,
    clearBatch,
    getActiveBatch,
  };
}
