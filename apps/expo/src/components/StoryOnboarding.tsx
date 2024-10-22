/* eslint-disable @typescript-eslint/no-var-requires */
import type { AVPlaybackSource } from "expo-av";
import React, { useRef, useState } from "react";
import { Dimensions, FlatList, Pressable, Text, View } from "react-native";
import { ResizeMode, Video } from "expo-av";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";

import { useAppStore } from "~/store";

interface StorySlide {
  title: string;
  description: string;
  videoUrl: AVPlaybackSource;
}

const storySlides: StorySlide[] = [
  {
    title: "Capture all the events you see",
    description: "Save screenshots, flyers, or links in seconds",
    videoUrl: require("../assets/capture.mp4") as AVPlaybackSource,
  },
  {
    title: "See events all in one place",
    description: "All your possibilities, automatically organized",
    videoUrl: require("../assets/list.mp4") as AVPlaybackSource,
  },
  {
    title: "Share events, if you want",
    description: "Private by default, share or make discoverable",
    videoUrl: require("../assets/share.mp4") as AVPlaybackSource,
  },
  {
    title: "Capture your first event",
    description: "Get ready with a screenshot, flyer, or link",
    videoUrl: require("../assets/add.mp4") as AVPlaybackSource,
  },
];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export function StoryOnboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const setHasCompletedOnboarding = useAppStore(
    (state) => state.setHasCompletedOnboarding,
  );

  const handleNext = () => {
    if (currentSlide < storySlides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentSlide + 1,
        animated: true,
      });
    } else {
      setHasCompletedOnboarding(true);
      router.replace("/feed");
    }
  };

  const handleSkip = () => {
    setHasCompletedOnboarding(true);
    router.replace("/feed");
  };

  const renderSlide = ({ item }: { item: StorySlide }) => (
    <View
      className="relative flex-1 bg-interactive-3"
      style={{ width: SCREEN_WIDTH }}
    >
      {/* Full height video container */}
      <View className="relative mx-[7.5%] mb-[10%] mt-[5%] h-full w-full">
        <Video
          source={item.videoUrl}
          style={{ width: "85%", height: "85%", borderRadius: 24 }}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted
        />
      </View>

      {/* Centered Text Container with iOS-style blur */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <BlurView
          intensity={60}
          tint="dark"
          style={{
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 24,
            overflow: "hidden",
          }}
        >
          <View className="bg-black/10 px-8 py-6" style={{ minWidth: 300 }}>
            <Text className="text-center text-2xl font-bold text-white">
              {item.title}
            </Text>
            <Text className="mt-2 text-center text-base text-white/90">
              {item.description}
            </Text>
          </View>
        </BlurView>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <View className="flex-1">
        <FlatList
          ref={flatListRef}
          data={storySlides}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const slideIndex = Math.round(
              event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
            );
            setCurrentSlide(slideIndex);
          }}
        />
      </View>

      {/* Fixed Footer with iOS-style blur */}
      <BlurView
        intensity={60}
        tint="dark"
        style={{
          position: "absolute",
          bottom: 0,
          width: "100%",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: "hidden",
        }}
      >
        <View className="flex-row gap-2 space-x-3 p-6">
          <Pressable
            onPress={handleSkip}
            className="flex-1 rounded-full border border-white/30 px-6 py-3.5"
          >
            <Text className="text-center text-base font-semibold text-white">
              Skip
            </Text>
          </Pressable>
          <Pressable
            onPress={handleNext}
            className="flex-1 rounded-full bg-interactive-1 px-6 py-3.5"
          >
            <Text className="text-center text-base font-bold text-white">
              {currentSlide < storySlides.length - 1 ? "Next" : "I'm Ready!"}
            </Text>
          </Pressable>
        </View>
      </BlurView>
    </View>
  );
}
