import type { Href } from "expo-router";
import { useCallback } from "react";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";

import { api } from "@soonlist/backend/convex/_generated/api";

import type { OnboardingData, OnboardingStep } from "~/types/onboarding";
import { useAppStore } from "~/store";
import { logError } from "~/utils/errorLogging";
import { useGuestUser } from "./useGuestUser";

export function useOnboarding() {
  const { user } = useUser();
  const { guestUserId } = useGuestUser();
  const posthog = usePostHog();
  const {
    setOnboardingData,
    setCurrentOnboardingStep,
    setHasCompletedOnboarding,
    setHasSeenOnboarding,
  } = useAppStore();

  const saveOnboardingDataMutation = useMutation(api.users.saveOnboardingData);
  const setOnboardingCompletedAtMutation = useMutation(
    api.users.setOnboardingCompletedAt,
  );
  const saveGuestOnboardingDataMutation = useMutation(
    api.guestOnboarding.saveGuestOnboardingData,
  );

  // Query to get current onboarding data (for invalidation purposes)
  const onboardingData = useQuery(
    api.users.getOnboardingData,
    user?.id ? { userId: user.id } : "skip",
  );

  const completeOnboarding = useCallback(async () => {
    const completedAt = new Date().toISOString();

    // For guest users, just mark onboarding as seen
    if (!user?.id) {
      setHasSeenOnboarding(true);
      posthog.capture("onboarding_completed", {
        userId: guestUserId,
        isGuest: true,
        completedAt,
      });
      return;
    }

    // For authenticated users, save to database
    setHasCompletedOnboarding(true);

    try {
      // Use Convex mutation to set completion timestamp
      await setOnboardingCompletedAtMutation({
        userId: user.id,
        completedAt,
      });

      posthog.capture("onboarding_completed", {
        userId: user.id,
        completedAt,
      });
    } catch (error) {
      logError("Failed to complete onboarding", error);
      // Revert optimistic update on error
      setHasCompletedOnboarding(false);
      throw error;
    }
  }, [
    posthog,
    setOnboardingCompletedAtMutation,
    user?.id,
    guestUserId,
    setHasCompletedOnboarding,
    setHasSeenOnboarding,
  ]);

  const saveStep = useCallback(
    <T extends keyof OnboardingData>(
      step: OnboardingStep,
      data: Pick<OnboardingData, T>,
      nextStep?: string,
    ) => {
      // Update store immediately for optimistic UI
      setOnboardingData(data);
      setCurrentOnboardingStep(step);

      // Navigate immediately if nextStep is provided
      if (nextStep) {
        void router.navigate(nextStep as Href);
      }

      // Handle saving in the background
      void (async () => {
        try {
          if (user?.id) {
            // Save to Convex database for authenticated users
            await saveOnboardingDataMutation({
              userId: user.id,
              ...data,
            });
          } else if (guestUserId) {
            // Save to guest onboarding data for guest users
            await saveGuestOnboardingDataMutation({
              guestUserId,
              data,
            });
          }

          // Track in PostHog
          posthog.capture("onboarding_step_completed", {
            step,
            userId: user?.id || guestUserId,
            isGuest: !user?.id,
            ...data,
          });
        } catch (error) {
          logError("Failed to save onboarding step", error, {
            step,
            userId: user?.id || guestUserId,
            isGuest: !user?.id,
            data,
          });
          // Note: We don't revert the optimistic update here since the user has already navigated
          // The data will be retried on next app launch or can be manually retried
        }
      })();
    },
    [
      posthog,
      saveOnboardingDataMutation,
      saveGuestOnboardingDataMutation,
      user?.id,
      guestUserId,
      setOnboardingData,
      setCurrentOnboardingStep,
    ],
  );

  return {
    saveStep,
    completeOnboarding,
    onboardingData, // Expose the current onboarding data for components that need it
  };
}
