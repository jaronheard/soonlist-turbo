import React from "react";
import { Pressable, Text, View } from "react-native";
import { ResizeMode, Video } from "expo-av";

import LoadingSpinner from "~/components/LoadingSpinner";
import { QuestionContainer } from "~/components/QuestionContainer";
import { useDemoVideo } from "~/hooks/useDemoVideo";
import { useOnboarding } from "~/hooks/useOnboarding";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

export default function SeeHowItWorksScreen() {
  const { saveStep } = useOnboarding();
  const { videoUrl, isLoading } = useDemoVideo();

  const handleContinue = () => {
    saveStep("demo", { watchedDemo: true }, "/(onboarding)/onboarding/paywall");
  };

  return (
    <QuestionContainer
      question="See how it works"
      subtitle="Watch a quick demo of Soonlist in action"
      currentStep={8}
      totalSteps={TOTAL_ONBOARDING_STEPS}
    >
      <View className="flex-1 justify-between">
        <View className="flex-1 items-center justify-center px-4 pb-4">
          <View
            className="overflow-hidden rounded-2xl bg-interactive-1"
            style={{
              width: "100%",
              maxWidth: 350,
              aspectRatio: 884 / 1920,
              maxHeight: "100%",
            }}
          >
            {isLoading || !videoUrl ? (
              <LoadingSpinner color="white" />
            ) : (
              <Video
                source={{ uri: videoUrl }}
                style={{ flex: 1 }}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={true}
                isLooping={true}
                useNativeControls={true}
                onError={(error) => {
                  console.error("Video loading error:", error);
                }}
              />
            )}
          </View>
        </View>

        <Pressable
          onPress={handleContinue}
          className="mx-4 rounded-2xl bg-interactive-1 px-6 py-4"
        >
          <Text className="text-center text-lg font-semibold text-white">
            Continue
          </Text>
        </Pressable>
      </View>
    </QuestionContainer>
  );
}
