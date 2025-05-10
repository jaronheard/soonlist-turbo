import { create } from "zustand";

interface InFlightEventState {
  isCapturing: boolean;
  setIsCapturing: (isCapturing: boolean) => void;
}

export const useInFlightEventStore = create<InFlightEventState>((set) => ({
  isCapturing: false,
  setIsCapturing: (isCapturing) => set({ isCapturing }),
}));
