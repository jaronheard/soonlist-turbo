import type * as Calendar from "expo-calendar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { ImageSource } from "~/components/demoData";
import type { OnboardingData, OnboardingStep } from "~/types/onboarding";
import type { RouterOutputs } from "~/utils/api";

export interface RecentPhoto {
  id: string;
  uri: string | ImageSource;
}

// Common event input state shared between add and new routes
interface CommonEventInputState {
  input: string;
  imagePreview: string | null;
  linkPreview: string | null;
  isPublic: boolean;
  isImageLoading: boolean;
  isImageUploading: boolean;
  uploadedImageUrl: string | null;
}

// State specific to the /add route
interface AddEventInputState extends CommonEventInputState {
  isOptionSelected: boolean;
  activeInput: "camera" | "upload" | "url" | "describe" | null;
}

// State specific to the /new route (share extension)
type NewEventInputState = CommonEventInputState;

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

  // Event input state for /add route
  addEventState: AddEventInputState;
  // Event input state for /new route (share extension)
  newEventState: NewEventInputState;

  // Event input actions
  setInput: (input: string, route: "add" | "new") => void;
  setImagePreview: (preview: string | null, route: "add" | "new") => void;
  setLinkPreview: (preview: string | null, route: "add" | "new") => void;
  setIsPublic: (isPublic: boolean, route: "add" | "new") => void;
  setIsImageLoading: (isLoading: boolean, route: "add" | "new") => void;
  setIsImageUploading: (isUploading: boolean, route: "add" | "new") => void;
  setUploadedImageUrl: (url: string | null, route: "add" | "new") => void;
  resetAddEventState: () => void;
  resetNewEventState: () => void;
  resetEventStateOnNewSelection: (route: "add" | "new") => void;

  // Add-specific actions
  setIsOptionSelected: (isSelected: boolean) => void;
  setActiveInput: (
    input: "camera" | "upload" | "url" | "describe" | null,
  ) => void;

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

  // Media-related state & actions
  recentPhotos: RecentPhoto[];
  hasMediaPermission: boolean;
  hasFullPhotoAccess: boolean;
  setRecentPhotos: (photos: RecentPhoto[]) => void;
  setHasMediaPermission: (hasPermission: boolean) => void;

  shouldRefreshMediaLibrary: boolean;
  setShouldRefreshMediaLibrary: (value: boolean) => void;

  // Add these new state properties
  isLoadingPhotos: boolean;
  photoLoadingError: string | null;

  // Add explicit types for these actions
  setIsLoadingPhotos: (isLoading: boolean) => void;
  setPhotoLoadingError: (error: string | null) => void;

  // User priority
  userPriority: string | null;
  setUserPriority: (priority: string) => void;

  // Onboarding state
  onboardingData: Partial<OnboardingData>;
  setOnboardingData: (data: Partial<OnboardingData>) => void;
  currentOnboardingStep: OnboardingStep | null;
  setCurrentOnboardingStep: (step: OnboardingStep | null) => void;
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
      userPriority: null,

      setFilter: (filter) => set({ filter }),
      setIntentParams: (params) => set({ intentParams: params }),
      setIsCalendarModalVisible: (isVisible) =>
        set({ isCalendarModalVisible: isVisible }),
      setShowAllCalendars: (show) => set({ showAllCalendars: show }),
      resetIntentParams: () => set({ intentParams: null }),

      // Initialize event input state for both routes
      addEventState: {
        input: "",
        imagePreview: null,
        linkPreview: null,
        isPublic: false,
        isImageLoading: false,
        isImageUploading: false,
        uploadedImageUrl: null,
        isOptionSelected: false,
        activeInput: null,
      },
      newEventState: {
        input: "",
        imagePreview: null,
        linkPreview: null,
        isPublic: false,
        isImageLoading: false,
        isImageUploading: false,
        uploadedImageUrl: null,
      },

      // Event input actions
      setInput: (input, route) =>
        set((state) => ({
          [route === "add" ? "addEventState" : "newEventState"]: {
            ...(route === "add" ? state.addEventState : state.newEventState),
            input,
          },
        })),
      setImagePreview: (preview, route) =>
        set((state) => ({
          [route === "add" ? "addEventState" : "newEventState"]: {
            ...(route === "add" ? state.addEventState : state.newEventState),
            imagePreview: preview,
          },
        })),
      setLinkPreview: (preview, route) =>
        set((state) => ({
          [route === "add" ? "addEventState" : "newEventState"]: {
            ...(route === "add" ? state.addEventState : state.newEventState),
            linkPreview: preview,
          },
        })),
      setIsPublic: (isPublic, route) =>
        set((state) => ({
          [route === "add" ? "addEventState" : "newEventState"]: {
            ...(route === "add" ? state.addEventState : state.newEventState),
            isPublic,
          },
        })),
      setIsImageLoading: (isLoading, route) =>
        set((state) => ({
          [route === "add" ? "addEventState" : "newEventState"]: {
            ...(route === "add" ? state.addEventState : state.newEventState),
            isImageLoading: isLoading,
          },
        })),
      setIsImageUploading: (isUploading, route) =>
        set((state) => ({
          [route === "add" ? "addEventState" : "newEventState"]: {
            ...(route === "add" ? state.addEventState : state.newEventState),
            isImageUploading: isUploading,
          },
        })),
      setUploadedImageUrl: (url, route) =>
        set((state) => ({
          [route === "add" ? "addEventState" : "newEventState"]: {
            ...(route === "add" ? state.addEventState : state.newEventState),
            uploadedImageUrl: url,
          },
        })),

      // Reset functions
      resetAddEventState: () =>
        set({
          addEventState: {
            input: "",
            imagePreview: null,
            linkPreview: null,
            isPublic: false,
            isImageLoading: false,
            isImageUploading: false,
            uploadedImageUrl: null,
            isOptionSelected: false,
            activeInput: null,
          },
        }),
      resetNewEventState: () =>
        set({
          newEventState: {
            input: "",
            imagePreview: null,
            linkPreview: null,
            isPublic: false,
            isImageLoading: false,
            isImageUploading: false,
            uploadedImageUrl: null,
          },
        }),
      resetEventStateOnNewSelection: (route) =>
        set((state: AppState) => ({
          [route === "add" ? "addEventState" : "newEventState"]: {
            ...(route === "add" ? state.addEventState : state.newEventState),
            input: "",
            imagePreview: null,
            linkPreview: null,
            isPublic: false,
            isImageLoading: false,
            isImageUploading: false,
            uploadedImageUrl: null,
          },
        })),

      // Add-specific actions
      setIsOptionSelected: (isSelected) =>
        set((state) => ({
          addEventState: {
            ...state.addEventState,
            isOptionSelected: isSelected,
          },
        })),
      setActiveInput: (input) =>
        set((state) => ({
          addEventState: {
            ...state.addEventState,
            activeInput: input,
          },
        })),

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
          addEventState: {
            input: "",
            imagePreview: null,
            linkPreview: null,
            isPublic: false,
            isImageLoading: false,
            isImageUploading: false,
            uploadedImageUrl: null,
            isOptionSelected: false,
            activeInput: null,
          },
          newEventState: {
            input: "",
            imagePreview: null,
            linkPreview: null,
            isPublic: false,
            isImageLoading: false,
            isImageUploading: false,
            uploadedImageUrl: null,
          },
          defaultCalendarId: null,
          availableCalendars: [],
          selectedEvent: null,
          calendarUsage: {},
          hasCompletedOnboarding: false,
          recentPhotos: [],
          hasMediaPermission: false,
          shouldRefreshMediaLibrary: false,
          isLoadingPhotos: false,
          photoLoadingError: null,
          userPriority: null,
          onboardingData: {},
          currentOnboardingStep: null,
        }),
      clearCalendarData: () =>
        set({
          defaultCalendarId: null,
          calendarUsage: {},
        }),

      // Media-related state & actions
      recentPhotos: [],
      hasMediaPermission: false,
      hasFullPhotoAccess: false,
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

      shouldRefreshMediaLibrary: false,
      setShouldRefreshMediaLibrary: (value) =>
        set({ shouldRefreshMediaLibrary: value }),

      // Add these new actions
      setIsLoadingPhotos: (isLoading) => set({ isLoadingPhotos: isLoading }),
      setPhotoLoadingError: (error) => set({ photoLoadingError: error }),

      // User priority
      setUserPriority: (priority) => set({ userPriority: priority }),

      // Onboarding state
      onboardingData: {},
      setOnboardingData: (data) =>
        set((state) => ({
          onboardingData: {
            ...state.onboardingData,
            ...data,
          },
        })),
      currentOnboardingStep: null,
      setCurrentOnboardingStep: (step) => set({ currentOnboardingStep: step }),
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
