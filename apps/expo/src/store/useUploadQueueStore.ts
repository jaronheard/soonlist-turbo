import { create } from "zustand";

export type UploadStatus = "queued" | "uploading" | "success" | "failed";

export interface QueueItem {
  id: string;            // local UUID for UI tracking
  assetUri: string;      // local file URI
  eventId?: string;      // server id after success
  progress: number;      // 0 → 1 (upload + AI + DB)
  status: UploadStatus;
  error?: string;
}

interface UploadQueueState {
  items: QueueItem[];
  enqueue: (uris: string[]) => void;
  start: (id: string) => void;
  update: (id: string, p: number) => void;
  succeed: (id: string, eventId: string) => void;
  fail: (id: string, err: string) => void;
  clearCompleted: () => void;
}

export const useUploadQueueStore = create<UploadQueueState>((set, get) => ({
  items: [],
  enqueue: (uris) =>
    set((s) => ({
      items: [
        ...s.items,
        ...uris.map((u) => ({
          id: crypto.randomUUID(),
          assetUri: u,
          progress: 0,
          status: "queued" as const,
        })),
      ],
    })),
  start: (id) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.id === id ? { ...i, status: "uploading" } : i,
      ),
    })),
  update: (id, p) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, progress: p } : i)),
    })),
  succeed: (id, eventId) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.id === id
          ? { ...i, progress: 1, status: "success", eventId }
          : i,
      ),
    })),
  fail: (id, err) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.id === id ? { ...i, status: "failed", error: err } : i,
      ),
    })),
  clearCompleted: () =>
    set((s) => ({ items: s.items.filter((i) => i.status !== "success") })),
}));

// Derived selectors (used throughout)
export const useQueueCounts = () =>
  useUploadQueueStore((s) => ({
    total: s.items.filter((i) => i.status !== "success").length,
    uploading: s.items.filter((i) => i.status === "uploading").length,
    failed: s.items.filter((i) => i.status === "failed").length,
  }));

export const useOverallProgress = () =>
  useUploadQueueStore((s) => {
    const active = s.items.filter(
      (i) => i.status === "uploading" || i.status === "queued",
    );
    if (!active.length) return 0;
    return (
      active.reduce((sum, i) => sum + i.progress, 0) / active.length
    );
  });

