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
  // Navigation and UI state
  filter: "upcoming" | "past";
  isCalendarModalVisible: boolean;
  showAllCalendars: boolean;
  hasCompletedOnboarding: boolean;

  // Intent handling
  intentParams: { text?: string; imageUri?: string } | null;

  // Event creation state
  input: string;
  imagePreview: string | null;
  linkPreview: string | null;
  isPublic: boolean;
  isImageLoading: boolean;
  isImageUploading: boolean;
  uploadedImageUrl: string | null;
  isOptionSelected: boolean;
  activeInput: "camera" | "upload" | "url" | "describe" | null;

  // Calendar state
  defaultCalendarId: string | null;
  availableCalendars: Calendar.Calendar[];
  selectedEvent: RouterOutputs["event"]["getUpcomingForUser"][number] | null;
  calendarUsage: Record<string, number>;

  // Media and photo state
  recentPhotos: RecentPhoto[];
  hasMediaPermission: boolean;
  hasFullPhotoAccess: boolean;
  shouldRefreshMediaLibrary: boolean;
  isLoadingPhotos: boolean;
  photoLoadingError: string | null;
  endCursor: string | undefined;
  hasMorePhotos: boolean;
  isLoadingMore: boolean;

  // Navigation and UI actions
  setFilter: (filter: "upcoming" | "past") => void;
  setIsCalendarModalVisible: (isVisible: boolean) => void;
  setShowAllCalendars: (show: boolean) => void;
  setHasCompletedOnboarding: (status: boolean) => void;

  // Intent actions
  setIntentParams: (
    params: { text?: string; imageUri?: string } | null,
  ) => void;
  resetIntentParams: () => void;

  // Event creation actions
  setInput: (input: string) => void;
  setImagePreview: (preview: string | null) => void;
  setLinkPreview: (preview: string | null) => void;
  setIsPublic: (isPublic: boolean) => void;
  setIsImageLoading: (isLoading: boolean) => void;
  setIsImageUploading: (isUploading: boolean) => void;
  setUploadedImageUrl: (url: string | null) => void;
  setIsOptionSelected: (isSelected: boolean) => void;
  setActiveInput: (
    input: "camera" | "upload" | "url" | "describe" | null,
  ) => void;
  resetAddEventState: () => void;
  resetEventStateOnNewSelection: () => void;

  // Calendar actions
  setDefaultCalendarId: (id: string | null) => void;
  setAvailableCalendars: (calendars: Calendar.Calendar[]) => void;
  setSelectedEvent: (
    event: RouterOutputs["event"]["getUpcomingForUser"][number] | null,
  ) => void;
  setCalendarUsage: (usage: Record<string, number>) => void;
  clearCalendarData: () => void;

  // Media and photo actions
  setRecentPhotos: (photos: RecentPhoto[]) => void;
  setHasMediaPermission: (hasPermission: boolean) => void;
  setShouldRefreshMediaLibrary: (value: boolean) => void;
  setIsLoadingPhotos: (isLoading: boolean) => void;
  setPhotoLoadingError: (error: string | null) => void;
  setEndCursor: (endCursor: string | undefined) => void;
  setHasMorePhotos: (value: boolean) => void;
  setIsLoadingMore: (value: boolean) => void;

  // Global actions
  resetStore: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Navigation and UI state
      filter: "upcoming",
      isCalendarModalVisible: false,
      showAllCalendars: false,
      hasCompletedOnboarding: false,

      // Intent handling
      intentParams: null,

      // Event creation state
      input: "",
      imagePreview: null,
      linkPreview: null,
      isPublic: false,
      isImageLoading: false,
      isImageUploading: false,
      uploadedImageUrl: null,
      isOptionSelected: false,
      activeInput: null,

      // Calendar state
      defaultCalendarId: null,
      availableCalendars: [],
      selectedEvent: null,
      calendarUsage: {},

      // Media and photo state
      recentPhotos: [],
      hasMediaPermission: false,
      hasFullPhotoAccess: false,
      shouldRefreshMediaLibrary: false,
      isLoadingPhotos: false,
      photoLoadingError: null,
      endCursor: undefined,
      hasMorePhotos: true,
      isLoadingMore: false,

      // Navigation and UI actions
      setFilter: (filter) => set({ filter }),
      setIsCalendarModalVisible: (isVisible) =>
        set({ isCalendarModalVisible: isVisible }),
      setShowAllCalendars: (show) => set({ showAllCalendars: show }),
      setHasCompletedOnboarding: (status) =>
        set({ hasCompletedOnboarding: status }),

      // Intent actions
      setIntentParams: (params) => set({ intentParams: params }),
      resetIntentParams: () => set({ intentParams: null }),

      // Event creation actions
      setInput: (input) => set({ input }),
      setImagePreview: (preview) => set({ imagePreview: preview }),
      setLinkPreview: (preview) => set({ linkPreview: preview }),
      setIsPublic: (isPublic) => set({ isPublic }),
      setIsImageLoading: (isLoading) => set({ isImageLoading: isLoading }),
      setIsImageUploading: (isUploading) =>
        set({ isImageUploading: isUploading }),
      setUploadedImageUrl: (url) => set({ uploadedImageUrl: url }),
      setIsOptionSelected: (isSelected) =>
        set({ isOptionSelected: isSelected }),
      setActiveInput: (input) => set({ activeInput: input }),
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
        }),

      // Calendar actions
      setDefaultCalendarId: (id) => set({ defaultCalendarId: id }),
      setAvailableCalendars: (calendars) =>
        set({ availableCalendars: calendars }),
      setSelectedEvent: (event) => set({ selectedEvent: event }),
      setCalendarUsage: (usage) => set({ calendarUsage: usage }),
      clearCalendarData: () =>
        set({
          defaultCalendarId: null,
          calendarUsage: {},
        }),

      // Media and photo actions
      setRecentPhotos: (photos) =>
        set((state) => {
          if (JSON.stringify(state.recentPhotos) === JSON.stringify(photos)) {
            return state;
          }
          return { recentPhotos: photos };
        }),
      setHasMediaPermission: (hasPermission) =>
        set({ hasMediaPermission: hasPermission }),
      setShouldRefreshMediaLibrary: (value) =>
        set({ shouldRefreshMediaLibrary: value }),
      setIsLoadingPhotos: (isLoading) => set({ isLoadingPhotos: isLoading }),
      setPhotoLoadingError: (error) => set({ photoLoadingError: error }),
      setEndCursor: (endCursor) => set({ endCursor }),
      setHasMorePhotos: (value) => set({ hasMorePhotos: value }),
      setIsLoadingMore: (value) => set({ isLoadingMore: value }),

      // Global actions
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
          endCursor: undefined,
          hasMorePhotos: true,
          isLoadingMore: false,
        }),
    }),
    {
      name: "app-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// Selectors
export const useRecentPhotos = () => useAppStore((state) => state.recentPhotos);
export const useHasMediaPermission = () =>
  useAppStore((state) => state.hasMediaPermission);
