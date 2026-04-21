"use client";

import { create } from "zustand";

interface BatchStore {
  batchIds: string[];
  addBatchId: (batchId: string) => void;
  removeBatchId: (batchId: string) => void;
}

export const useBatchStore = create<BatchStore>((set) => ({
  batchIds: [],
  addBatchId: (batchId) =>
    set((state) => ({
      batchIds: state.batchIds.includes(batchId)
        ? state.batchIds
        : [...state.batchIds, batchId],
    })),
  removeBatchId: (batchId) =>
    set((state) => ({
      batchIds: state.batchIds.filter((id) => id !== batchId),
    })),
}));
