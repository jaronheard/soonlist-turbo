import type { ImageSourcePropType } from "react-native";
import React, { useRef, useState } from "react";
import { Dimensions, FlatList, Pressable, Text, View } from "react-native";
import { ResizeMode, Video } from "expo-av";
import { useRouter } from "expo-router";

import { useAppStore } from "~/store";

interface StorySlide {
  title: string;
  description: string;
  videoUrl: ImageSourcePropType;
}

const storySlides: StorySlide[] = [
  {
    title: "Capture all the events you see",
    description: "Save screenshots, flyers, or links in seconds",
    videoUrl: require("../assets/capture.mp4"),
  },
  {
    title: "See events all in one place",
    description: "All your possibilities, automatically organized",
    videoUrl: require("../assets/list.mp4"),
  },
  {
    title: "Share events, if you want",
    description: "Private by default, share or make discoverable",
    videoUrl: require("../assets/share.mp4"),
  },
  // {
  //   title: "We're here to help",
  //   description: "Soonlist is new, and we're working to make it better.",
  //   imageUrl:
  //     require("../assets/ (3) .png"),
  // },
  {
    title: "Capture your first event",
    description: "Get ready with a screenshot, flyer, or link",
    imageUrl: require("../assets/add.mp4"),
  },
];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const VIDEO_HEIGHT = SCREEN_HEIGHT * 0.5; // Increase video height to 50% of screen height

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
    <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
      <View className="flex-1 justify-between py-10">
        <View className="items-center">
          <Video
            source={item.videoUrl}
            style={{ width: SCREEN_WIDTH, height: VIDEO_HEIGHT }}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping
            isMuted
          />
        </View>
        <View className="items-center space-y-4 px-4">
          <Text className="text-center text-3xl font-bold text-neutral-1">
            {item.title}
          </Text>
          <Text className="text-center text-xl text-neutral-2">
            {item.description}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View className="relative flex-1 bg-background">
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
      <View className="absolute bottom-8 left-0 right-0 px-20">
        <Pressable
          onPress={handleNext}
          className="rounded-full bg-interactive-1 px-6 py-3"
        >
          <Text className="text-center text-lg font-bold text-white">
            {currentSlide < storySlides.length - 1 ? "Next" : "I'm Ready!"}
          </Text>
        </Pressable>
        <Pressable onPress={handleSkip} className="mt-2 rounded-full px-6 py-3">
          <Text className="text-center text-lg font-bold text-neutral-1">
            Skip
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
