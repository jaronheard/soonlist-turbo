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

  const onboardingData = useQuery(
    api.users.getOnboardingData,
    user?.id ? { userId: user.id } : "skip",
  );

  const completeOnboarding = useCallback(async () => {
    const completedAt = new Date().toISOString();

    if (!user?.id) {
      setHasSeenOnboarding(true);
      posthog.capture("onboarding_completed", {
        userId: guestUserId,
        isGuest: true,
        completedAt,
      });
      return;
    }

    setHasCompletedOnboarding(true);

    try {
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
      setOnboardingData(data);
      setCurrentOnboardingStep(step);

      if (nextStep) {
        void router.navigate(nextStep as Href);
      }

      void (async () => {
        try {
          if (user?.id) {
            await saveOnboardingDataMutation({
              userId: user.id,
              ...data,
            });
          } else if (guestUserId) {
            await saveGuestOnboardingDataMutation({
              guestUserId,
              data,
            });
          }

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
