import React from "react";
import { Linking, Pressable, Text, View } from "react-native";
import * as StoreReview from "expo-store-review";

import { QuestionContainer } from "~/components/QuestionContainer";
import { useOnboarding } from "~/hooks/useOnboarding";
import {
  useHasShownRatingPrompt,
  useMarkRatingPromptShown,
  usePendingFollowUsername,
  useSetHasSeenOnboarding,
} from "~/store";
import { hapticLight } from "~/utils/feedback";

const FEATURE_ROWS: {
  emoji: string;
  title: string;
  description: string;
}[] = [
  {
    emoji: "📅",
    title: "Save events and share lists",
    description: "Free to use and share.",
  },
  {
    emoji: "🛡️",
    title: "No ads, no infinite scroll.",
    description: "We value your attention.",
  },
  {
    emoji: "💝",
    title: "Support for extras",
    description: "Optional extras fund the app.",
  },
];

const JARON_INSTAGRAM_URL = "https://www.instagram.com/jaronheard/";

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
      subtitle="Free because community access matters."
      questionTextClassName="text-4xl"
      currentStep={currentStep}
      totalSteps={totalSteps}
    >
      <View className="flex-1 justify-between">
        <View className="flex-1 justify-center">
          <View className="gap-10">
            {FEATURE_ROWS.map(({ emoji, title, description }) => (
              <View key={title} className="flex-row items-center gap-4">
                <Text className="mt-1 shrink-0 text-5xl leading-none">
                  {emoji}
                </Text>
                <View className="min-w-0 flex-1">
                  <Text className="text-2xl font-semibold text-white">
                    {title}
                  </Text>
                  <Text className="mt-1 text-lg leading-snug text-white/70">
                    {description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
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
            </Text>{" "}
            & friends
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
