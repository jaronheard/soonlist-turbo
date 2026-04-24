import { create } from "zustand";

interface InFlightEventState {
  isCapturing: boolean;
  setIsCapturing: (isCapturing: boolean) => void;
  // Track pending batch IDs for non-notification users to show completion feedback
  pendingBatchIds: string[];
  addPendingBatchId: (batchId: string) => void;
  removePendingBatchId: (batchId: string) => void;
  clearPendingBatchIds: () => void;

  // The most recent capture batch surfaced in the iOS 26 tab bar bottom
  // accessory ("now capturing" mini-player). Independent of pendingBatchIds,
  // which only drives in-app banners for users without push permission.
  // Lives in memory only — auto-clears on app restart.
  accessoryBatchId: string | null;
  accessoryStartedAt: number | null;
  accessoryCompletedAt: number | null;
  setAccessoryBatch: (batchId: string) => void;
  markAccessoryCompleted: () => void;
  dismissAccessoryBatch: () => void;
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

  accessoryBatchId: null,
  accessoryStartedAt: null,
  accessoryCompletedAt: null,
  setAccessoryBatch: (batchId) =>
    set({
      accessoryBatchId: batchId,
      accessoryStartedAt: Date.now(),
      accessoryCompletedAt: null,
    }),
  markAccessoryCompleted: () =>
    set((state) =>
      state.accessoryBatchId && !state.accessoryCompletedAt
        ? { accessoryCompletedAt: Date.now() }
        : state,
    ),
  dismissAccessoryBatch: () =>
    set({
      accessoryBatchId: null,
      accessoryStartedAt: null,
      accessoryCompletedAt: null,
    }),
}));
