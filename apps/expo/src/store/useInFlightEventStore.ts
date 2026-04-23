import { create } from "zustand";

interface InFlightEventState {
  isCapturing: boolean;
  setIsCapturing: (isCapturing: boolean) => void;
  pendingBatchIds: string[];
  addPendingBatchId: (batchId: string) => void;
  removePendingBatchId: (batchId: string) => void;
  clearPendingBatchIds: () => void;
}

export const useInFlightEventStore = create<InFlightEventState>((set) => ({
  isCapturing: false,
  setIsCapturing: (isCapturing) => set({ isCapturing }),
  pendingBatchIds: [],
  addPendingBatchId: (batchId) =>
    set((state) => ({
      pendingBatchIds: [...state.pendingBatchIds, batchId],
    })),
  removePendingBatchId: (batchId) =>
    set((state) => ({
      pendingBatchIds: state.pendingBatchIds.filter((id) => id !== batchId),
    })),
  clearPendingBatchIds: () => set({ pendingBatchIds: [] }),
}));
