"use client";

import { create } from "zustand";

interface BatchProgressStore {
  pendingBatchId: string | null;
  setPendingBatchId: (batchId: string) => void;
  clearPendingBatchId: () => void;
}

export const useBatchProgressStore = create<BatchProgressStore>((set) => ({
  pendingBatchId: null,
  setPendingBatchId: (batchId) => set({ pendingBatchId: batchId }),
  clearPendingBatchId: () => set({ pendingBatchId: null }),
}));
