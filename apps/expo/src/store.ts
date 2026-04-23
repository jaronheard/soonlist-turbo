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

function createStableTimestamp(): string {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundedMinutes = Math.floor(minutes / 15) * 15;
  const stableTime = new Date(now);
  stableTime.setMinutes(roundedMinutes, 0, 0);
  return stableTime.toISOString();
}

interface CommonEventInputState {
  input: string;
  imagePreview: string | null;
  linkPreview: string | null;
  isPublic: boolean;
  isImageLoading: boolean;
  isImageUploading: boolean;
  uploadedImageUrl: string | null;
}

interface AddEventInputState extends CommonEventInputState {
  isOptionSelected: boolean;
  activeInput: "camera" | "upload" | "url" | "describe" | null;
}

type NewEventInputState = CommonEventInputState;

interface AppState {
  filter: "upcoming" | "past";
  intentParams: { text?: string; imageUri?: string } | null;
  setFilter: (filter: "upcoming" | "past") => void;
  setIntentParams: (
    params: { text?: string; imageUri?: string } | null,
  ) => void;

  preferredCalendarApp: CalendarApp | null;
  setPreferredCalendarApp: (app: CalendarApp | null) => void;

  stableTimestamp: string;
  lastTimestampUpdate: number;
  refreshStableTimestamp: () => void;
  getStableTimestamp: () => string;

  userTimezone: string;
  hasShownTimezoneAlert: boolean;
  setUserTimezone: (timezone: string) => void;
  setHasShownTimezoneAlert: (hasShown: boolean) => void;

  addEventState: AddEventInputState;
  newEventState: NewEventInputState;

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

  recentPhotos: RecentPhoto[];
  hasMediaPermission: boolean;
  hasFullPhotoAccess: boolean;
  setRecentPhotos: (photos: RecentPhoto[]) => void;
  setHasMediaPermission: (hasPermission: boolean) => void;

  userPriority: string | null;
  setUserPriority: (priority: string) => void;

  onboardingData: Partial<OnboardingData>;
  setOnboardingData: (data: Partial<OnboardingData>) => void;
  currentOnboardingStep: OnboardingStep | null;
  setCurrentOnboardingStep: (step: OnboardingStep | null) => void;

  workflowIds: string[];
  addWorkflowId: (workflowId: string) => void;
  removeWorkflowId: (workflowId: string) => void;
  clearAllWorkflowIds: () => void;

  totalEventViews: number;
  lastPaywallShownAtView: number;
  incrementEventView: () => void;
  shouldShowViewPaywall: () => boolean;
  markPaywallShown: () => void;
  resetEventViews: () => void;

  discoverAccessOverride: boolean;
  setDiscoverAccessOverride: (enabled: boolean) => void;

  hasShownRatingPrompt: boolean;
  markRatingPromptShown: () => void;

  hasSeenShareListPrompt: boolean;
  setShareListPromptSeen: () => void;

  pendingFollowUsername: string | null;
  setPendingFollowUsername: (username: string | null) => void;

  myListBadgeCount: number;
  setMyListBadgeCount: (count: number) => void;
  communityBadgeCount: number;
  setCommunityBadgeCount: (count: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      filter: "upcoming",
      intentParams: null,
      userPriority: null,
      userTimezone: getUserTimeZone(),
      hasShownTimezoneAlert: false,

      preferredCalendarApp: null,
      setPreferredCalendarApp: (app) => set({ preferredCalendarApp: app }),

      discoverAccessOverride: false,
      setDiscoverAccessOverride: (enabled) =>
        set((s) => ({ ...s, discoverAccessOverride: enabled })),

      setFilter: (filter) => set({ filter }),
      setIntentParams: (params) => set({ intentParams: params }),
      setUserTimezone: (timezone) => set({ userTimezone: timezone }),
      setHasShownTimezoneAlert: (hasShown) =>
        set({ hasShownTimezoneAlert: hasShown }),

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

      recentPhotos: [],
      hasMediaPermission: false,
      hasFullPhotoAccess: false,

      setRecentPhotos: (photos) => set({ recentPhotos: photos }),
      setHasMediaPermission: (hasPermission) =>
        set({ hasMediaPermission: hasPermission }),

      setUserPriority: (priority) => set({ userPriority: priority }),

      hasCompletedOnboarding: false,
      hasSeenOnboarding: false,
      onboardingData: {},
      currentOnboardingStep: null,

      setHasCompletedOnboarding: (status) =>
        set({ hasCompletedOnboarding: status }),
      setHasSeenOnboarding: (seen) => set({ hasSeenOnboarding: seen }),
      setOnboardingData: (data) =>
        set((state) => ({
          onboardingData: { ...state.onboardingData, ...data },
        })),
      setCurrentOnboardingStep: (step) => set({ currentOnboardingStep: step }),

      resetStore: () =>
        set({
          filter: "upcoming",
          intentParams: null,
          preferredCalendarApp: null,
          discoverAccessOverride: false,
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
          hasShownRatingPrompt: false,
          hasSeenShareListPrompt: false,
          pendingFollowUsername: null,
          myListBadgeCount: 0,
          communityBadgeCount: 0,
        }),

      resetForLogout: () =>
        set((state) => ({
          filter: "upcoming",
          intentParams: null,
          preferredCalendarApp: null,
          discoverAccessOverride: false,
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
          hasSeenOnboarding: state.hasSeenOnboarding, // Keep this value
          onboardingData: {},
          currentOnboardingStep: null,
          workflowIds: [],
          totalEventViews: 0,
          lastPaywallShownAtView: 0,
          hasShownRatingPrompt: false,
          hasSeenShareListPrompt: false,
          pendingFollowUsername: state.pendingFollowUsername,
          myListBadgeCount: 0,
          communityBadgeCount: 0,
        })),

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

      totalEventViews: 0,
      lastPaywallShownAtView: 0,
      incrementEventView: () =>
        set((state) => ({
          totalEventViews: state.totalEventViews + 1,
        })),
      shouldShowViewPaywall: () => {
        const state = get();
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

      hasShownRatingPrompt: false,
      markRatingPromptShown: () => set({ hasShownRatingPrompt: true }),

      hasSeenShareListPrompt: false,
      setShareListPromptSeen: () => set({ hasSeenShareListPrompt: true }),

      pendingFollowUsername: null,
      setPendingFollowUsername: (username) =>
        set({ pendingFollowUsername: username }),

      myListBadgeCount: 0,
      setMyListBadgeCount: (count) => set({ myListBadgeCount: count }),
      communityBadgeCount: 0,
      setCommunityBadgeCount: (count) => set({ communityBadgeCount: count }),
    }),
    {
      name: "app-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { discoverAccessOverride, ...rest } = state;
        return rest;
      },
    },
  ),
);

export const useRecentPhotos = () => useAppStore((state) => state.recentPhotos);
export const useHasMediaPermission = () =>
  useAppStore((state) => state.hasMediaPermission);
export const useUserTimezone = () => useAppStore((state) => state.userTimezone);

export const useStableTimestamp = () => {
  const { stableTimestamp, lastTimestampUpdate, refreshStableTimestamp } =
    useAppStore((state) => ({
      stableTimestamp: state.stableTimestamp,
      lastTimestampUpdate: state.lastTimestampUpdate,
      refreshStableTimestamp: state.refreshStableTimestamp,
    }));

  React.useEffect(() => {
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;

    if (now - lastTimestampUpdate > fifteenMinutes) {
      refreshStableTimestamp();
    }
  }, [lastTimestampUpdate, refreshStableTimestamp]);

  return stableTimestamp;
};
export const useRefreshStableTimestamp = () =>
  useAppStore((state) => state.refreshStableTimestamp);

export const useRefreshTimestampOnFocus = () => {
  const refreshTimestamp = useRefreshStableTimestamp();

  return refreshTimestamp;
};

export const useSetHasSeenOnboarding = () =>
  useAppStore((state) => state.setHasSeenOnboarding);

export const useIncrementEventView = () =>
  useAppStore((state) => state.incrementEventView);

export const useShouldShowViewPaywall = () =>
  useAppStore((state) => state.shouldShowViewPaywall);

export const useMarkPaywallShown = () =>
  useAppStore((state) => state.markPaywallShown);

export const useHasShownRatingPrompt = () =>
  useAppStore((state) => state.hasShownRatingPrompt);
export const useMarkRatingPromptShown = () =>
  useAppStore((state) => state.markRatingPromptShown);

export const useHasSeenShareListPrompt = () =>
  useAppStore((state) => state.hasSeenShareListPrompt);
export const useSetShareListPromptSeen = () =>
  useAppStore((state) => state.setShareListPromptSeen);

export const usePreferredCalendarApp = () =>
  useAppStore((state) => state.preferredCalendarApp);
export const useSetPreferredCalendarApp = () =>
  useAppStore((state) => state.setPreferredCalendarApp);

export const usePendingFollowUsername = () =>
  useAppStore((state) => state.pendingFollowUsername);
export const useSetPendingFollowUsername = () =>
  useAppStore((state) => state.setPendingFollowUsername);
