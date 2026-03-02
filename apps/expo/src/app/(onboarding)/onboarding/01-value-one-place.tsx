import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";

import { QuestionContainer } from "~/components/QuestionContainer";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

export default function ValueOnePlaceScreen() {
  const handleContinue = () => {
    router.navigate("/(onboarding)/onboarding/02-value-batch");
  };

  return (
    <QuestionContainer
      question="One place for all your events"
      subtitle="No matter where you find them — Instagram, flyers, texts — save them all here"
      currentStep={1}
      totalSteps={TOTAL_ONBOARDING_STEPS}
    >
      <View className="flex-1 justify-between">
        <View className="flex-1 items-center justify-center px-4 pb-4">
          <ExpoImage
            // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
            source={require("../../../assets/feed.png")}
            style={{ width: "100%", height: "100%" }}
            contentFit="contain"
            cachePolicy="disk"
            transition={100}
          />
        </View>

        <View className="mb-4 rounded-xl bg-white/10 px-4 py-3">
          <Text className="text-center text-sm text-white/80">
            Join thousands of people saving events with Soonlist
          </Text>
        </View>

        <Pressable
          onPress={handleContinue}
          className="rounded-full bg-white py-4"
        >
          <Text className="text-center text-lg font-semibold text-interactive-1">
            Continue
          </Text>
        </Pressable>
      </View>
    </QuestionContainer>
  );
}
