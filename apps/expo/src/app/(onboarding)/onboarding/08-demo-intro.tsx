import type { AVPlaybackStatus } from "expo-av";
import React, { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ResizeMode, Video } from "expo-av";

import LoadingSpinner from "~/components/LoadingSpinner";
import { QuestionContainer } from "~/components/QuestionContainer";
import { useDemoVideo } from "~/hooks/useDemoVideo";
import { useOnboarding } from "~/hooks/useOnboarding";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

export default function SeeHowItWorksScreen() {
  const { saveStep } = useOnboarding();
  const { videoUrl, isPlaying, isLoading, play, pause } = useDemoVideo();
  const videoRef = useRef<Video>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

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
              <>
                {!isVideoReady && (
                  <View className="absolute inset-0 z-10">
                    <LoadingSpinner color="white" />
                  </View>
                )}
                <Video
                  ref={videoRef}
                  source={{ uri: videoUrl }}
                  style={{ flex: 1, opacity: isVideoReady ? 1 : 0 }}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={true}
                  isLooping={true}
                  useNativeControls={true}
                  onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                    if (status.isLoaded) {
                      if (status.isPlaying && !isPlaying) {
                        play();
                      } else if (!status.isPlaying && isPlaying) {
                        pause();
                      }
                    }
                  }}
                  onLoad={() => {
                    if (__DEV__) {
                      console.log("Demo video loaded and ready to play");
                    }
                    setIsVideoReady(true);
                    play();
                  }}
                  onError={(error) => {
                    console.error("Video loading error:", error);
                    setIsVideoReady(true); // Hide spinner even on error
                  }}
                />
              </>
            )}
          </View>
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
