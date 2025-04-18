import type * as Calendar from "expo-calendar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { OnboardingData, OnboardingStep } from "~/types/onboarding";
import type { RouterOutputs } from "~/utils/api";
import { getUserTimeZone } from "./utils/dates";

export interface RecentPhoto {
  id: string;
  uri: string;
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

  // Timezone-related state
  userTimezone: string;
  hasShownTimezoneAlert: boolean;
  setUserTimezone: (timezone: string) => void;
  setHasShownTimezoneAlert: (hasShown: boolean) => void;

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

  resetIntentParams: () => void;
  resetOnboarding: () => void;
  resetAddEventState: () => void;
  resetNewEventState: () => void;

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
      userPriority: null,
      userTimezone: getUserTimeZone(),
      hasShownTimezoneAlert: false,

      setFilter: (filter) => set({ filter }),
      setIntentParams: (params) => set({ intentParams: params }),
      setIsCalendarModalVisible: (isVisible) =>
        set({ isCalendarModalVisible: isVisible }),
      setShowAllCalendars: (show) => set({ showAllCalendars: show }),
      setUserTimezone: (timezone) => set({ userTimezone: timezone }),
      setHasShownTimezoneAlert: (hasShown) =>
        set({ hasShownTimezoneAlert: hasShown }),

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
      resetIntentParams: () => set({ intentParams: null }),
      resetOnboarding: () =>
        set({
          hasCompletedOnboarding: false,
          onboardingData: {},
          currentOnboardingStep: null,
        }),
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
      clearCalendarData: () =>
        set({
          defaultCalendarId: null,
          availableCalendars: [],
          selectedEvent: null,
          calendarUsage: {},
        }),

      // Media-related state
      recentPhotos: [],
      hasMediaPermission: false,
      hasFullPhotoAccess: false,

      // Media-related actions
      setRecentPhotos: (photos) => set({ recentPhotos: photos }),
      setHasMediaPermission: (hasPermission) =>
        set({ hasMediaPermission: hasPermission }),

      // User priority
      setUserPriority: (priority) => set({ userPriority: priority }),

      // Onboarding state
      hasCompletedOnboarding: false,
      onboardingData: {},
      currentOnboardingStep: null,

      // Onboarding actions
      setHasCompletedOnboarding: (status) =>
        set({ hasCompletedOnboarding: status }),
      setOnboardingData: (data) =>
        set((state) => ({
          onboardingData: { ...state.onboardingData, ...data },
        })),
      setCurrentOnboardingStep: (step) => set({ currentOnboardingStep: step }),

      // Global reset
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
          recentPhotos: [],
          hasMediaPermission: false,
          hasFullPhotoAccess: false,
          userPriority: null,
          userTimezone: getUserTimeZone(),
          hasShownTimezoneAlert: false,
          // note: hasCompletedOnboarding is not reset here, reset in useSignOut
          onboardingData: {},
          currentOnboardingStep: null,
        }),
    }),
    {
      name: "app-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// Selector hooks for commonly used state
export const useRecentPhotos = () => useAppStore((state) => state.recentPhotos);
export const useHasMediaPermission = () =>
  useAppStore((state) => state.hasMediaPermission);
export const useUserTimezone = () => useAppStore((state) => state.userTimezone);
