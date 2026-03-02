import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";

import { QuestionContainer } from "~/components/QuestionContainer";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

export default function ValueBatchScreen() {
  const handleContinue = () => {
    router.navigate("/(onboarding)/onboarding/03-goals");
  };

  return (
    <QuestionContainer
      question="Add them all at once"
      subtitle="Select multiple screenshots from your camera roll and save them in seconds"
      currentStep={2}
      totalSteps={TOTAL_ONBOARDING_STEPS}
    >
      <View className="flex-1 justify-between">
        <View className="flex-1 items-center justify-center px-4 pb-4">
          {/* Grid preview showing batch capture concept */}
          <View className="w-full flex-1 items-center justify-center">
            <View className="w-full max-w-[300px] flex-row flex-wrap justify-center gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <View
                  key={i}
                  className="h-28 w-[85px] items-center justify-center rounded-xl bg-white/20"
                >
                  <ExpoImage
                    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
                    source={require("../../../assets/feed.png")}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    cachePolicy="disk"
                    transition={100}
                  />
                  {i <= 3 && (
                    <View className="absolute right-1 top-1 h-5 w-5 items-center justify-center rounded-full bg-interactive-1">
                      <Text className="text-xs font-bold text-white">
                        {"\u2713"}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>

        <View className="mb-4 rounded-xl bg-white/10 px-4 py-3">
          <Text className="text-center text-sm text-white/80">
            Most people have 5+ event screenshots saved already
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
