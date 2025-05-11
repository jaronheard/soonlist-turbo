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
  eventId?: string;
  animationIntervalId?: NodeJS.Timeout | number;
}

interface UploadQueueStore {
  queue: UploadQueueItem[];
  successCount: number;
  lastId: string | null;
  addToQueue: (imageUri: string) => string;
  updateItemStatus: (id: string, status: UploadStatus, error?: string) => void;
  removeFromQueue: (id: string) => void;
  retryItem: (id: string) => void;
  getActiveItems: () => UploadQueueItem[];
  getCompletedItems: () => UploadQueueItem[];
  getFailedItems: () => UploadQueueItem[];
  getTotalItems: () => number;
  clearCompletedItems: () => void;
  startItem: (id: string) => void;
  succeedItem: (id: string, eventId: string) => void;
  failItem: (id: string, errorMsg: string) => void;
}

export const useUploadQueueStore = create<UploadQueueStore>()((set, get) => ({
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
    get().startItem(id);
    return id;
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
    get().startItem(id);
  },

  getActiveItems: () => {
    const state = get();
    return state.queue.filter(
      (item: UploadQueueItem) => item.status === "active",
    );
  },

  getCompletedItems: () => {
    const state = get();
    return state.queue.filter(
      (item: UploadQueueItem) => item.status === "completed",
    );
  },

  getFailedItems: () => {
    const state = get();
    return state.queue.filter(
      (item: UploadQueueItem) => item.status === "failed",
    );
  },

  getTotalItems: () => {
    const state = get();
    return state.queue.length;
  },

  clearCompletedItems: () => {
    set((state) => ({
      queue: state.queue.filter((item) => {
        if (item.status === "completed" && item.animationIntervalId) {
          clearInterval(item.animationIntervalId as unknown as number);
        }
        return item.status !== "completed";
      }),
    }));
  },

  startItem: (id) => {
    set((state) => {
      const item = state.queue.find((i) => i.id === id);
      if (item?.animationIntervalId) {
        clearInterval(item.animationIntervalId as unknown as number);
      }
      return {
        queue: state.queue.map((i) =>
          i.id === id
            ? {
                ...i,
                status: "active",
                progress: 0,
                error: undefined,
                updatedAt: new Date(),
                animationIntervalId: undefined,
              }
            : i,
        ),
      };
    });

    const currentItem = get().queue.find((i) => i.id === id);
    if (!currentItem) return;

    const animationDuration = 3600;
    const updateFrequency = 50;
    const steps = animationDuration / updateFrequency;
    const progressIncrement = 0.9 / steps;

    const intervalId = setInterval(() => {
      const activeItem = get().queue.find((i) => i.id === id);
      if (!activeItem || activeItem.status !== "active") {
        clearInterval(intervalId as unknown as number);
        return;
      }

      let newProgress = (activeItem.progress ?? 0) + progressIncrement;
      if (newProgress >= 0.9) {
        newProgress = 0.9;
        clearInterval(intervalId as unknown as number);
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === id ? { ...item, animationIntervalId: undefined } : item,
          ),
        }));
      }

      set((state) => ({
        queue: state.queue.map((item) =>
          item.id === id
            ? { ...item, progress: newProgress, updatedAt: new Date() }
            : item,
        ),
      }));
    }, updateFrequency);

    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id ? { ...item, animationIntervalId: intervalId } : item,
      ),
    }));
  },

  succeedItem: (id, eventId) => {
    set((state) => {
      const item = state.queue.find((i) => i.id === id);
      if (item?.animationIntervalId) {
        clearInterval(item.animationIntervalId as unknown as number);
      }

      const itemExists = state.queue.find((i) => i.id === id);
      const newSuccessCount =
        itemExists && itemExists.status !== "completed"
          ? state.successCount + 1
          : state.successCount;

      return {
        queue: state.queue.map((i) =>
          i.id === id
            ? {
                ...i,
                status: "completed",
                progress: 1,
                eventId,
                error: undefined,
                updatedAt: new Date(),
                animationIntervalId: undefined,
              }
            : i,
        ),
        successCount: newSuccessCount,
      };
    });
  },

  failItem: (id, errorMsg) => {
    set((state) => {
      const item = state.queue.find((i) => i.id === id);
      if (item?.animationIntervalId) {
        clearInterval(item.animationIntervalId as unknown as number);
      }
      return {
        queue: state.queue.map((i) =>
          i.id === id
            ? {
                ...i,
                status: "failed",
                error: errorMsg,
                updatedAt: new Date(),
                animationIntervalId: undefined,
              }
            : i,
        ),
      };
    });
  },
}));
