import { create } from "zustand";

interface AppState {
  filter: "upcoming" | "past";
  intentParams: { text?: string; imageUri?: string } | null;
  isCalendarModalVisible: boolean;
  showAllCalendars: boolean;
  setFilter: (filter: "upcoming" | "past") => void;
  setIntentParams: (
    params: { text?: string; imageUri?: string } | null,
  ) => void;
  setIsCalendarModalVisible: (isVisible: boolean) => void;
  setShowAllCalendars: (show: boolean) => void;
  resetIntentParams: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  filter: "upcoming",
  intentParams: null,
  isCalendarModalVisible: false,
  showAllCalendars: false,
  setFilter: (filter) => set({ filter }),
  setIntentParams: (params) => set({ intentParams: params }),
  setIsCalendarModalVisible: (isVisible) =>
    set({ isCalendarModalVisible: isVisible }),
  setShowAllCalendars: (show) => set({ showAllCalendars: show }),
  resetIntentParams: () => set({ intentParams: null }),
}));
