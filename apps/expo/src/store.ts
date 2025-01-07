import type * as Calendar from "expo-calendar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { RouterOutputs } from "~/utils/api";

export interface RecentPhoto {
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
  clearCalendarData: () => void;

  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (status: boolean) => void;
  resetStore: () => void;

  // New event state & actions
  isOptionSelected: boolean;
  activeInput: "camera" | "upload" | "url" | "describe" | null;
  setIsOptionSelected: (isSelected: boolean) => void;
  setActiveInput: (
    input: "camera" | "upload" | "url" | "describe" | null,
  ) => void;

  // Media-related state & actions
  recentPhotos: RecentPhoto[];
  hasMediaPermission: boolean;
  hasFullPhotoAccess: boolean;
  setRecentPhotos: (photos: RecentPhoto[]) => void;
  setHasMediaPermission: (hasPermission: boolean) => void;

  shouldRefreshMediaLibrary: boolean;
  setShouldRefreshMediaLibrary: (value: boolean) => void;

  // Photo loading and pagination state
  isLoadingPhotos: boolean;
  photoLoadingError: string | null;
  endCursor: string | undefined;
  hasMorePhotos: boolean;
  isLoadingMore: boolean;

  // Photo loading and pagination actions
  setIsLoadingPhotos: (isLoading: boolean) => void;
  setPhotoLoadingError: (error: string | null) => void;
  setEndCursor: (endCursor: string | undefined) => void;
  setHasMorePhotos: (value: boolean) => void;
  setIsLoadingMore: (value: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      filter: "upcoming",
      intentParams: null,
      isCalendarModalVisible: false,
      showAllCalendars: false,
      isLoadingPhotos: false,
      photoLoadingError: null,

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
          shouldRefreshMediaLibrary: false,
          isLoadingPhotos: false,
          photoLoadingError: null,
        }),
      clearCalendarData: () =>
        set({
          defaultCalendarId: null,
          calendarUsage: {},
        }),

      // New event state & actions
      isOptionSelected: false,
      activeInput: null,
      setIsOptionSelected: (isSelected) =>
        set({ isOptionSelected: isSelected }),
      setActiveInput: (input) => set({ activeInput: input }),

      // Media-related state & actions
      recentPhotos: [],
      hasMediaPermission: false,
      hasFullPhotoAccess: false,
      shouldRefreshMediaLibrary: false,

      // Photo loading and pagination state
      endCursor: undefined,
      hasMorePhotos: true,
      isLoadingMore: false,
      isLoadingPhotos: false,
      photoLoadingError: null,

      setRecentPhotos: (photos) =>
        set((state) => {
          // Only update if the photos are different
          if (JSON.stringify(state.recentPhotos) === JSON.stringify(photos)) {
            return state;
          }
          return { recentPhotos: photos };
        }),
      setHasMediaPermission: (hasPermission) =>
        set({ hasMediaPermission: hasPermission }),
      setShouldRefreshMediaLibrary: (value) =>
        set({ shouldRefreshMediaLibrary: value }),

      // Photo loading and pagination actions
      setIsLoadingPhotos: (isLoading) => set({ isLoadingPhotos: isLoading }),
      setPhotoLoadingError: (error) => set({ photoLoadingError: error }),
      setEndCursor: (endCursor) => set({ endCursor }),
      setHasMorePhotos: (value) => set({ hasMorePhotos: value }),
      setIsLoadingMore: (value) => set({ isLoadingMore: value }),
    }),
    {
      name: "app-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// Add a new selector to optimize recentPhotos access
export const useRecentPhotos = () => useAppStore((state) => state.recentPhotos);
export const useHasMediaPermission = () =>
  useAppStore((state) => state.hasMediaPermission);
