import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { OnboardingData, OnboardingStep } from "~/types/onboarding";
import type { CalendarApp } from "~/utils/calendarAppDetection";
import { getUserTimeZone } from "./utils/dates";

export interface RecentPhoto {
  id: string;
  uri: string;
}

// Helper function to create a stable timestamp (rounded to 15-minute intervals)
function createStableTimestamp(): string {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundedMinutes = Math.floor(minutes / 15) * 15;
  const stableTime = new Date(now);
  stableTime.setMinutes(roundedMinutes, 0, 0); // Set seconds and milliseconds to 0
  return stableTime.toISOString();
}

/**
 * Stable Timestamp System
 *
 * This system provides a timestamp that updates every 15 minutes, designed for use
 * in paginated queries that filter by time (e.g., upcoming vs past events).
 *
 * Benefits:
 * - Prevents InvalidCursor errors during pagination by keeping the filter stable
 * - Maintains optimistic updates since Convex queries remain reactive
 * - Automatically updates every 15 minutes to keep data relatively fresh
 * - Can be manually refreshed when switching screens or on user action
 *
 * Usage:
 * ```tsx
 * const stableTimestamp = useStableTimestamp();
 * const refreshTimestamp = useRefreshStableTimestamp();
 *
 * // Use in queries
 * const queryArgs = {
 *   filter: "upcoming",
 * };
 *
 * // Manually refresh when needed (e.g., on screen focus)
 * useEffect(() => {
 *   refreshTimestamp();
 * }, []);
 * ```
 */

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
  setFilter: (filter: "upcoming" | "past") => void;
  setIntentParams: (
    params: { text?: string; imageUri?: string } | null,
  ) => void;

  // Calendar preferences
  preferredCalendarApp: CalendarApp | null;
  setPreferredCalendarApp: (app: CalendarApp | null) => void;

  // Stable timestamp for query filtering
  stableTimestamp: string;
  lastTimestampUpdate: number;
  refreshStableTimestamp: () => void;
  getStableTimestamp: () => string;

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

  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (status: boolean) => void;
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: (seen: boolean) => void;
  resetStore: () => void;
  resetForLogout: () => void;

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

  // Workflow state
  workflowIds: string[];
  addWorkflowId: (workflowId: string) => void;
  removeWorkflowId: (workflowId: string) => void;
  clearAllWorkflowIds: () => void;

  // Event view tracking for paywall
  totalEventViews: number;
  lastPaywallShownAtView: number;
  incrementEventView: () => void;
  shouldShowViewPaywall: () => boolean;
  markPaywallShown: () => void;
  resetEventViews: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      filter: "upcoming",
      intentParams: null,
      userPriority: null,
      userTimezone: getUserTimeZone(),
      hasShownTimezoneAlert: false,

      // Calendar preferences
      preferredCalendarApp: null,
      setPreferredCalendarApp: (app) => set({ preferredCalendarApp: app }),

      setFilter: (filter) => set({ filter }),
      setIntentParams: (params) => set({ intentParams: params }),
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
          hasSeenOnboarding: false,
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
      hasSeenOnboarding: false,
      onboardingData: {},
      currentOnboardingStep: null,

      // Onboarding actions
      setHasCompletedOnboarding: (status) =>
        set({ hasCompletedOnboarding: status }),
      setHasSeenOnboarding: (seen) => set({ hasSeenOnboarding: seen }),
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
          preferredCalendarApp: null,
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
          recentPhotos: [],
          hasMediaPermission: false,
          hasFullPhotoAccess: false,
          userPriority: null,
          userTimezone: getUserTimeZone(),
          hasShownTimezoneAlert: false,
          stableTimestamp: createStableTimestamp(),
          lastTimestampUpdate: Date.now(),
          hasCompletedOnboarding: false,
          hasSeenOnboarding: false,
          onboardingData: {},
          currentOnboardingStep: null,
          workflowIds: [],
          totalEventViews: 0,
          lastPaywallShownAtView: 0,
        }),

      // Reset for logout - preserves onboarding state
      resetForLogout: () =>
        set((state) => ({
          filter: "upcoming",
          intentParams: null,
          preferredCalendarApp: null,
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
          recentPhotos: [],
          hasMediaPermission: false,
          hasFullPhotoAccess: false,
          userPriority: null,
          userTimezone: getUserTimeZone(),
          hasShownTimezoneAlert: false,
          stableTimestamp: createStableTimestamp(),
          lastTimestampUpdate: Date.now(),
          // Preserve onboarding state for logout
          hasCompletedOnboarding: false,
          hasSeenOnboarding: state.hasSeenOnboarding, // Keep this value
          onboardingData: {},
          currentOnboardingStep: null,
          workflowIds: [],
          totalEventViews: 0,
          lastPaywallShownAtView: 0,
        })),

      // Stable timestamp for query filtering
      stableTimestamp: createStableTimestamp(),
      lastTimestampUpdate: Date.now(),
      refreshStableTimestamp: () =>
        set({
          stableTimestamp: createStableTimestamp(),
          lastTimestampUpdate: Date.now(),
        }),
      getStableTimestamp: (): string => {
        const state = get();
        return state.stableTimestamp;
      },

      // Workflow state
      workflowIds: [],
      addWorkflowId: (workflowId) =>
        set((state) => ({
          workflowIds: [...state.workflowIds, workflowId],
        })),
      removeWorkflowId: (workflowId) =>
        set((state) => ({
          workflowIds: state.workflowIds.filter((id) => id !== workflowId),
        })),
      clearAllWorkflowIds: () => set({ workflowIds: [] }),

      // Event view tracking for paywall
      totalEventViews: 0,
      lastPaywallShownAtView: 0,
      incrementEventView: () =>
        set((state) => ({
          totalEventViews: state.totalEventViews + 1,
        })),
      shouldShowViewPaywall: () => {
        const state = get();
        // Show paywall every 20 views after the last shown
        return (
          state.totalEventViews > 0 &&
          state.totalEventViews >= state.lastPaywallShownAtView + 20
        );
      },
      markPaywallShown: () =>
        set((state) => ({
          lastPaywallShownAtView: state.totalEventViews,
        })),
      resetEventViews: () =>
        set({
          totalEventViews: 0,
          lastPaywallShownAtView: 0,
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

// Stable timestamp selectors
export const useStableTimestamp = () => {
  const { stableTimestamp, lastTimestampUpdate, refreshStableTimestamp } =
    useAppStore((state) => ({
      stableTimestamp: state.stableTimestamp,
      lastTimestampUpdate: state.lastTimestampUpdate,
      refreshStableTimestamp: state.refreshStableTimestamp,
    }));

  React.useEffect(() => {
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000; // 15 minutes

    if (now - lastTimestampUpdate > fifteenMinutes) {
      refreshStableTimestamp();
    }
  }, [lastTimestampUpdate, refreshStableTimestamp]);

  return stableTimestamp;
};
export const useRefreshStableTimestamp = () =>
  useAppStore((state) => state.refreshStableTimestamp);

/**
 * Hook to refresh the stable timestamp when a screen comes into focus.
 * Useful for ensuring fresh data when users navigate between screens.
 *
 * @example
 * ```tsx
 * function MyScreen() {
 *   useRefreshTimestampOnFocus();
 *   // ... rest of component
 * }
 * ```
 */
export const useRefreshTimestampOnFocus = () => {
  const refreshTimestamp = useRefreshStableTimestamp();

  // You can uncomment this if you want to use react-navigation's focus events
  // const isFocused = useIsFocused();
  //
  // React.useEffect(() => {
  //   if (isFocused) {
  //     refreshTimestamp();
  //   }
  // }, [isFocused, refreshTimestamp]);

  return refreshTimestamp;
};

// Auto-generated selectors for actions (following Zustand best practices)
// These provide stable references to actions without using getState()
export const useSetHasSeenOnboarding = () =>
  useAppStore((state) => state.setHasSeenOnboarding);

export const useIncrementEventView = () =>
  useAppStore((state) => state.incrementEventView);

export const useShouldShowViewPaywall = () =>
  useAppStore((state) => state.shouldShowViewPaywall);

export const useMarkPaywallShown = () =>
  useAppStore((state) => state.markPaywallShown);

// Auto-generated selector pattern for stable action references
// Note: Use the individual hook exports above instead of this pattern
// to avoid rules-of-hooks violations

// Calendar preference selectors
export const usePreferredCalendarApp = () =>
  useAppStore((state) => state.preferredCalendarApp);
export const useSetPreferredCalendarApp = () =>
  useAppStore((state) => state.setPreferredCalendarApp);
