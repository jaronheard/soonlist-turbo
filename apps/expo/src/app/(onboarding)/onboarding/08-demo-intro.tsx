import type { AVPlaybackStatus } from "expo-av";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ResizeMode, Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";

import { QuestionContainer } from "~/components/QuestionContainer";
import { useDemoVideo } from "~/hooks/useDemoVideo";
import { useOnboarding } from "~/hooks/useOnboarding";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

export default function SeeHowItWorksScreen() {
  const { saveStep } = useOnboarding();
  const { videoUri, isLoading, error, downloadProgress, retry, isDownloading } =
    useDemoVideo();
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasFinishedPlaying, setHasFinishedPlaying] = useState(false);

  const handleContinue = () => {
    saveStep("demo", { watchedDemo: true }, "/(onboarding)/onboarding/paywall");
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setHasFinishedPlaying(true);
      }
    }
  };

  const handleReplay = async () => {
    if (videoRef.current) {
      await videoRef.current.replayAsync();
      setHasFinishedPlaying(false);
    }
  };

  const handlePlayPause = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
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
        <View className="flex-1 items-center justify-center px-4">
          <View className="aspect-video w-full max-w-sm overflow-hidden rounded-2xl bg-neutral-2">
            {isLoading || isDownloading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#FFF" />
                {isDownloading && (
                  <Text className="mt-4 text-sm text-white/60">
                    Downloading... {Math.round(downloadProgress * 100)}%
                  </Text>
                )}
              </View>
            ) : error ? (
              <View className="flex-1 items-center justify-center px-4">
                <Ionicons name="alert-circle-outline" size={48} color="#FFF" />
                <Text className="mt-4 text-center text-white/60">
                  Unable to load video
                </Text>
                <TouchableOpacity
                  onPress={retry}
                  className="mt-4 rounded-full bg-white/20 px-4 py-2"
                >
                  <Text className="text-white">Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : videoUri ? (
              <View className="flex-1">
                <Video
                  ref={videoRef}
                  source={{ uri: videoUri }}
                  rate={1.0}
                  volume={1.0}
                  isMuted={false}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay
                  isLooping={false}
                  onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                  style={{ flex: 1 }}
                />
                {/* Video controls overlay */}
                <View className="absolute inset-0 items-center justify-center">
                  {hasFinishedPlaying ? (
                    <TouchableOpacity
                      onPress={handleReplay}
                      className="rounded-full bg-black/50 p-4"
                      accessibilityRole="button"
                      accessibilityLabel="Replay video"
                    >
                      <Ionicons name="refresh" size={32} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={handlePlayPause}
                      className="rounded-full bg-black/50 p-4"
                      style={{ opacity: isPlaying ? 0 : 1 }}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isPlaying ? "Pause video" : "Play video"
                      }
                      accessibilityState={{ selected: isPlaying }}
                    >
                      <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={32}
                        color="#FFF"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <View className="flex-1 items-center justify-center">
                <Text className="text-white/60">No video available</Text>
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
