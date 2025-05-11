/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { create } from "zustand";
import { nanoid } from "nanoid";

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useUploadQueueStore = create<UploadQueueStore>((set, get) => ({
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
        item.id === id
          ? { ...item, progress, updatedAt: new Date() }
          : item
      ),
    }));
  },

  updateItemStatus: (id, status, error) => {
    set((state) => {
      const newSuccessCount = 
        status === "completed" 
          ? state.successCount + 1 
          : state.successCount;
      
      return {
        queue: state.queue.map((item) =>
          item.id === id
            ? { 
                ...item, 
                status, 
                error, 
                updatedAt: new Date(),
                // If completed, set progress to 1
                ...(status === "completed" ? { progress: 1 } : {})
              }
            : item
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
          : item
      ),
    }));
  },

  getActiveItems: () => {
    const state = useUploadQueueStore.getState();
    return state.queue.filter((item) => item.status === "active");
  },

  getCompletedItems: () => {
    const state = useUploadQueueStore.getState();
    return state.queue.filter((item) => item.status === "completed");
  },

  getFailedItems: () => {
    const state = useUploadQueueStore.getState();
    return state.queue.filter((item) => item.status === "failed");
  },

  getTotalItems: () => {
    const state = useUploadQueueStore.getState();
    return state.queue.length;
  },

  clearCompletedItems: () => {
    set((state) => ({
      queue: state.queue.filter((item) => item.status !== "completed"),
    }));
  },
}));

