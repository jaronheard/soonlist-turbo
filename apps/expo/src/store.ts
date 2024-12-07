import type * as Calendar from "expo-calendar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { RouterOutputs } from "~/utils/api";

interface RecentPhoto {
  id: string;
  uri: string;
}

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
  input: string;
  imagePreview: string | null;
  linkPreview: string | null;
  isPublic: boolean;
  isImageLoading: boolean;
  isImageUploading: boolean;
  uploadedImageUrl: string | null;
  setInput: (input: string) => void;
  setImagePreview: (preview: string | null) => void;
  setLinkPreview: (preview: string | null) => void;
  setIsPublic: (isPublic: boolean) => void;
  setIsImageLoading: (isLoading: boolean) => void;
  setIsImageUploading: (isUploading: boolean) => void;
  setUploadedImageUrl: (url: string | null) => void;
  resetAddEventState: () => void;
  resetEventStateOnNewSelection: () => void;

  // Calendar-related state
  defaultCalendarId: string | null;
  availableCalendars: Calendar.Calendar[];
  selectedEvent: RouterOutputs["event"]["getUpcomingForUser"][number] | null;
  calendarUsage: Record<string, number>;

  // Calendar-related actions
  setDefaultCalendarId: (id: string | null) => void;
  setAvailableCalendars: (calendars: Calendar.Calendar[]) => void;
  setSelectedEvent: (
    event: RouterOutputs["event"]["getUpcomingForUser"][number] | null,
  ) => void;
  setCalendarUsage: (usage: Record<string, number>) => void;

  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (status: boolean) => void;
  resetStore: () => void;

  // Add this new action
  clearCalendarData: () => void;

  // New state for AddEventBottomSheet
  isOptionSelected: boolean;
  activeInput: "camera" | "upload" | "url" | "describe" | null;

  // New actions for AddEventBottomSheet
  setIsOptionSelected: (isSelected: boolean) => void;
  setActiveInput: (
    input: "camera" | "upload" | "url" | "describe" | null,
  ) => void;

  // Add new media-related state
  recentPhotos: RecentPhoto[];
  hasMediaPermission: boolean;

  // Add new actions
  setRecentPhotos: (photos: RecentPhoto[]) => void;
  setHasMediaPermission: (hasPermission: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
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
      input: "",
      imagePreview: null,
      linkPreview: null,
      isPublic: false,
      isImageLoading: false,
      isImageUploading: false,
      uploadedImageUrl: null,
      setInput: (input) => set({ input }),
      setImagePreview: (preview) => set({ imagePreview: preview }),
      setLinkPreview: (preview) => set({ linkPreview: preview }),
      setIsPublic: (isPublic) => set({ isPublic }),
      setIsImageLoading: (isLoading) => set({ isImageLoading: isLoading }),
      setIsImageUploading: (isUploading) =>
        set({ isImageUploading: isUploading }),
      setUploadedImageUrl: (url) => set({ uploadedImageUrl: url }),
      resetAddEventState: () =>
        set({
          input: "",
          imagePreview: null,
          linkPreview: null,
          isPublic: false,
          isImageLoading: false,
          isImageUploading: false,
          uploadedImageUrl: null,
          isOptionSelected: false,
          activeInput: null,
        }),
      resetEventStateOnNewSelection: () =>
        set({
          input: "",
          imagePreview: null,
          linkPreview: null,
          isPublic: false,
          isImageLoading: false,
          isImageUploading: false,
          uploadedImageUrl: null,
          // Keep isOptionSelected and activeInput unchanged
        }),

      // Calendar-related state
      defaultCalendarId: null,
      availableCalendars: [],
      selectedEvent: null,
      calendarUsage: {},

      // Calendar-related actions
      setDefaultCalendarId: (id) => set({ defaultCalendarId: id }),
      setAvailableCalendars: (calendars) =>
        set({ availableCalendars: calendars }),
      setSelectedEvent: (event) => set({ selectedEvent: event }),
      setCalendarUsage: (usage) => set({ calendarUsage: usage }),

      hasCompletedOnboarding: false,
      setHasCompletedOnboarding: (status) =>
        set({ hasCompletedOnboarding: status }),
      resetStore: () =>
        set({
          filter: "upcoming",
          intentParams: null,
          isCalendarModalVisible: false,
          showAllCalendars: false,
          input: "",
          imagePreview: null,
          linkPreview: null,
          isPublic: false,
          isImageLoading: false,
          isImageUploading: false,
          uploadedImageUrl: null,
          defaultCalendarId: null,
          availableCalendars: [],
          selectedEvent: null,
          calendarUsage: {},
          hasCompletedOnboarding: false,
          isOptionSelected: false,
          activeInput: null,
          recentPhotos: [],
          hasMediaPermission: false,
        }),
      clearCalendarData: () =>
        set({
          defaultCalendarId: null,
          calendarUsage: {},
        }),

      // New state for AddEventBottomSheet
      isOptionSelected: false,
      activeInput: null,

      // New actions for AddEventBottomSheet
      setIsOptionSelected: (isSelected) =>
        set({ isOptionSelected: isSelected }),
      setActiveInput: (input) => set({ activeInput: input }),

      // Add new media-related state
      recentPhotos: [],
      hasMediaPermission: false,

      // Add new actions
      setRecentPhotos: (photos) => set({ recentPhotos: photos }),
      setHasMediaPermission: (hasPermission) =>
        set({ hasMediaPermission: hasPermission }),
    }),
    {
      name: "app-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
