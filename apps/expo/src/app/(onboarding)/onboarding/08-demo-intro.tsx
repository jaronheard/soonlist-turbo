import type { AVPlaybackStatus } from "expo-av";
import React, { useRef } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { ResizeMode, Video } from "expo-av";
import PauseIcon from "~/components/icons/Pause";
import PlayIcon from "~/components/icons/Play";
import RotateCcwIcon from "~/components/icons/RotateCcw";

import { QuestionContainer } from "~/components/QuestionContainer";
import { useDemoVideo } from "~/hooks/useDemoVideo";
import { useOnboarding } from "~/hooks/useOnboarding";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

export default function SeeHowItWorksScreen() {
  const { saveStep } = useOnboarding();
  const { video, videoUrl, isPlaying, isLoading, play, pause, replay } =
    useDemoVideo();
  const videoRef = useRef<Video>(null);

  const handleContinue = () => {
    saveStep("demo", { watchedDemo: true }, "/(onboarding)/onboarding/paywall");
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  return (
    <QuestionContainer
      question="See how it works"
      subtitle="Watch a quick demo of Soonlist in action"
      currentStep={8}
      totalSteps={TOTAL_ONBOARDING_STEPS}
    >
      <View className="flex-1 justify-between">
        <View className="flex-1 items-center justify-center">
          <View className="h-64 w-full max-w-sm overflow-hidden rounded-2xl bg-neutral-2">
            {isLoading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#ffffff" />
                <Text className="mt-2 text-sm text-white/60">
                  Loading video...
                </Text>
              </View>
            ) : videoUrl ? (
              <>
                <Video
                  ref={videoRef}
                  source={{ uri: videoUrl }}
                  style={{ flex: 1 }}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={false}
                  isLooping={false}
                  onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                    if (status.isLoaded && status.didJustFinish) {
                      pause();
                    }
                  }}
                />
                <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-4">
                  <Pressable
                    onPress={handlePlayPause}
                    className="h-12 w-12 items-center justify-center rounded-full bg-white/20"
                  >
                    {isPlaying ? (
                      <PauseIcon size={20} color="white" />
                    ) : (
                      <PlayIcon size={20} color="white" />
                    )}
                  </Pressable>
                  <Pressable
                    onPress={replay}
                    className="h-12 w-12 items-center justify-center rounded-full bg-white/20"
                  >
                    <RotateCcwIcon size={20} color="white" />
                  </Pressable>
                </View>
              </>
            ) : (
              <View className="flex-1 items-center justify-center">
                <Text className="text-lg text-white/60">
                  No video available
                </Text>
              </View>
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
