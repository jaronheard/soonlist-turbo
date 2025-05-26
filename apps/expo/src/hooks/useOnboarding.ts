import type { Href } from "expo-router";
import { useCallback } from "react";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";

import { api } from "@soonlist/backend";

import type { OnboardingData, OnboardingStep } from "~/types/onboarding";
import { useAppStore } from "~/store";
import { logError } from "~/utils/errorLogging";

export function useOnboarding() {
  const { user } = useUser();
  const posthog = usePostHog();
  const {
    setOnboardingData,
    setCurrentOnboardingStep,
    setHasCompletedOnboarding,
  } = useAppStore();

  // Use Convex mutations instead of tRPC
  const saveOnboardingDataMutation = useMutation(api.users.saveOnboardingData);
  const setOnboardingCompletedAtMutation = useMutation(
    api.users.setOnboardingCompletedAt,
  );

  // Query to get current onboarding data (for invalidation purposes)
  const onboardingData = useQuery(
    api.users.getOnboardingData,
    user?.id ? { userId: user.id } : "skip",
  );

  const completeOnboarding = useCallback(async () => {
    if (!user?.id) {
      logError(
        "Cannot complete onboarding: user ID not available",
        new Error("User ID not available"),
      );
      return;
    }

    const completedAt = new Date().toISOString();
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
    setHasCompletedOnboarding,
  ]);

  const saveStep = useCallback(
    <T extends keyof OnboardingData>(
      step: OnboardingStep,
      data: Pick<OnboardingData, T>,
      nextStep?: string,
    ) => {
      if (!user?.id) {
        logError(
          "Cannot save onboarding step: user ID not available",
          new Error("User ID not available"),
        );
        return;
      }

      // Update store immediately for optimistic UI
      setOnboardingData(data);
      setCurrentOnboardingStep(step);

      // Navigate immediately if nextStep is provided
      if (nextStep) {
        router.push(nextStep as Href);
      }

      // Handle saving in the background
      void (async () => {
        try {
          // Save to Convex database
          await saveOnboardingDataMutation({
            userId: user.id,
            ...data,
          });

          // Track in PostHog
          posthog.capture("onboarding_step_completed", {
            step,
            userId: user.id,
            ...data,
          });
        } catch (error) {
          logError("Failed to save onboarding step", error, {
            step,
            userId: user.id,
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
      user?.id,
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
