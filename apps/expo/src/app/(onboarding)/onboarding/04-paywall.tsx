import React from "react";
import { Linking, Pressable, Text, View } from "react-native";
import * as StoreReview from "expo-store-review";

import { Check } from "~/components/icons";
import { QuestionContainer } from "~/components/QuestionContainer";
import { useOnboarding } from "~/hooks/useOnboarding";
import {
  useHasShownRatingPrompt,
  useMarkRatingPromptShown,
  usePendingFollowUsername,
  useSetHasSeenOnboarding,
} from "~/store";
import { hapticLight } from "~/utils/feedback";

const BULLETS = [
  "Save events and share lists, free",
  "No ads. No algorithm. No data sold.",
  "Support for extras, not access",
];

const JARON_INSTAGRAM_URL = "https://www.instagram.com/jaronherad/";

function openJaronInstagram() {
  void Linking.openURL(JARON_INSTAGRAM_URL);
}

export default function CommunitySupportedScreen() {
  const pendingFollowUsername = usePendingFollowUsername();
  const setHasSeenOnboarding = useSetHasSeenOnboarding();
  const hasShownRatingPrompt = useHasShownRatingPrompt();
  const markRatingPromptShown = useMarkRatingPromptShown();
  const { saveStep } = useOnboarding();

  // Keep the existing step math: this screen sits at totalSteps - 2,
  // with sign-in at totalSteps - 1 and the final tick reserved for the
  // "account created" state.
  const totalSteps = pendingFollowUsername ? 7 : 6;
  const currentStep = totalSteps - 2;

  const handleContinue = () => {
    void hapticLight();
    setHasSeenOnboarding(true);
    if (!hasShownRatingPrompt) {
      void (async () => {
        if (await StoreReview.hasAction()) {
          await StoreReview.requestReview();
        }
        markRatingPromptShown();
      })();
    }
    saveStep("paywall", {}, "/(onboarding)/onboarding/05-sign-in");
  };

  return (
    <QuestionContainer
      question="Soonlist is free."
      subtitle="Free because community access matters. You can support the app and unlock extras, but the essentials stay free for everyone."
      currentStep={currentStep}
      totalSteps={totalSteps}
    >
      <View className="flex-1 justify-between">
        <View className="mt-4">
          {BULLETS.map((text) => (
            <View key={text} className="mb-5 flex-row items-start">
              <View className="mr-3 mt-1 h-6 w-6 items-center justify-center rounded-full bg-white">
                <Check size={16} color="#5A32FB" strokeWidth={3} />
              </View>
              <Text className="flex-1 text-lg text-white">{text}</Text>
            </View>
          ))}
        </View>

        <View>
          <Text className="mb-4 text-center text-sm text-white/70">
            💖 Built in Portland by{" "}
            <Text
              accessibilityRole="link"
              accessibilityLabel="Jaron on Instagram"
              className="text-sm text-white underline"
              onPress={() => {
                void hapticLight();
                openJaronInstagram();
              }}
            >
              Jaron
            </Text>
            {" "}& friends
          </Text>
          <Pressable
            onPress={handleContinue}
            className="rounded-full bg-white py-4 active:scale-[0.98] active:bg-neutral-100"
          >
            <Text className="text-center text-lg font-semibold text-interactive-1">
              Continue
            </Text>
          </Pressable>
        </View>
      </View>
    </QuestionContainer>
  );
}
