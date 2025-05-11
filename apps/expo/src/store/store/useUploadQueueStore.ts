import { nanoid } from "nanoid";
import { create } from "zustand";

export type UploadStatus = "active" | "completed" | "failed";

export interface UploadQueueItem {
  id: string;
  imageUri: string;
  status: UploadStatus;
  progress?: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UploadQueueStore {
  queue: UploadQueueItem[];
  successCount: number;
  lastId: string | null;
  addToQueue: (imageUri: string) => string;
  updateItemProgress: (id: string, progress: number) => void;
  updateItemStatus: (id: string, status: UploadStatus, error?: string) => void;
  removeFromQueue: (id: string) => void;
  retryItem: (id: string) => void;
  getActiveItems: () => UploadQueueItem[];
  getCompletedItems: () => UploadQueueItem[];
  getFailedItems: () => UploadQueueItem[];
  getTotalItems: () => number;
  clearCompletedItems: () => void;
}

export const useUploadQueueStore = create<UploadQueueStore>()((set, _get) => ({
  queue: [],
  successCount: 0,
  lastId: null,

  addToQueue: (imageUri) => {
    const id = nanoid();
    const now = new Date();

    set((state) => ({
      queue: [
        ...state.queue,
        {
          id,
          imageUri,
          status: "active",
          progress: 0,
          createdAt: now,
          updatedAt: now,
        },
      ],
      lastId: id,
    }));

    return id;
  },

  updateItemProgress: (id, progress) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id ? { ...item, progress, updatedAt: new Date() } : item,
      ),
    }));
  },

  updateItemStatus: (id, status, error) => {
    set((state) => {
      const newSuccessCount =
        status === "completed" ? state.successCount + 1 : state.successCount;

      return {
        queue: state.queue.map((item) =>
          item.id === id
            ? {
                ...item,
                status,
                error,
                updatedAt: new Date(),
                // If completed, set progress to 1
                ...(status === "completed" ? { progress: 1 } : {}),
              }
            : item,
        ),
        successCount: newSuccessCount,
      };
    });
  },

  removeFromQueue: (id) => {
    set((state) => ({
      queue: state.queue.filter((item) => item.id !== id),
    }));
  },

  retryItem: (id) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "active",
              progress: 0,
              error: undefined,
              updatedAt: new Date(),
            }
          : item,
      ),
    }));
  },

  getActiveItems: () => {
    const state = _get();
    return state.queue.filter(
      (item: UploadQueueItem) => item.status === "active",
    );
  },

  getCompletedItems: () => {
    const state = _get();
    return state.queue.filter(
      (item: UploadQueueItem) => item.status === "completed",
    );
  },

  getFailedItems: () => {
    const state = _get();
    return state.queue.filter(
      (item: UploadQueueItem) => item.status === "failed",
    );
  },

  getTotalItems: () => {
    const state = _get();
    return state.queue.length;
  },

  clearCompletedItems: () => {
    set((state) => ({
      queue: state.queue.filter((item) => item.status !== "completed"),
    }));
  },
}));
