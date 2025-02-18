import type { Href } from "expo-router";
import { useCallback } from "react";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { usePostHog } from "posthog-react-native";

import type { OnboardingData, OnboardingStep } from "~/types/onboarding";
import { useAppStore } from "~/store";
import { api } from "~/utils/api";

export function useOnboarding() {
  const { user } = useUser();
  const posthog = usePostHog();
  const utils = api.useContext();
  const {
    setOnboardingData,
    setCurrentOnboardingStep,
    setHasCompletedOnboarding,
  } = useAppStore();

  const { mutateAsync: saveOnboardingData } =
    api.user.saveOnboardingData.useMutation({
      onSuccess: () => {
        void utils.user.getOnboardingData.invalidate();
      },
    });

  const { mutateAsync: setOnboardingCompletedAt } =
    api.user.setOnboardingCompletedAt.useMutation({
      onSuccess: () => {
        void utils.user.getOnboardingData.invalidate();
      },
    });

  const completeOnboarding = useCallback(async () => {
    const completedAt = new Date();
    setHasCompletedOnboarding(true);

    // setOnboardingCompletedAt also saves it in onboardingData
    await Promise.all([
      setOnboardingCompletedAt({
        completedAt,
      }),
    ]);

    posthog.capture("onboarding_completed", {
      userId: user?.id,
      completedAt,
    });
  }, [posthog, setOnboardingCompletedAt, user?.id, setHasCompletedOnboarding]);

  const saveStep = useCallback(
    <T extends keyof OnboardingData>(
      step: OnboardingStep,
      data: Pick<OnboardingData, T>,
      nextStep?: string,
    ) => {
      // Update store immediately
      setOnboardingData(data);
      setCurrentOnboardingStep(step);

      // Navigate immediately if nextStep is provided
      if (nextStep) {
        router.push(nextStep as Href);
      }

      // Handle saving in the background
      void (async () => {
        // Save to database
        await saveOnboardingData({
          ...data,
        });

        // Track in PostHog
        posthog.capture("onboarding_step_completed", {
          step,
          userId: user?.id,
          ...data,
        });
      })();
    },
    [
      posthog,
      saveOnboardingData,
      user?.id,
      setOnboardingData,
      setCurrentOnboardingStep,
    ],
  );

  return {
    saveStep,
    completeOnboarding,
  };
}
