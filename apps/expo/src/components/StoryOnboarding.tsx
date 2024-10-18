/* eslint-disable @typescript-eslint/no-var-requires */
import type { ImageSourcePropType } from "react-native";
import React, { useRef, useState } from "react";
import { Dimensions, FlatList, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import { useAppStore } from "~/store";

interface StorySlide {
  title: string;
  description: string;
  imageUrl: ImageSourcePropType;
}

const storySlides: StorySlide[] = [
  {
    title: "Capture all the events you see",
    description: "Save screenshots, flyers, or links in seconds",
    imageUrl:
      require("../assets/Miroodles - Color Comp.png") as ImageSourcePropType,
  },
  {
    title: "See them all in one place",
    description: "All your possibilities, automatically organized.",
    imageUrl:
      require("../assets/Miroodles - Color Comp (1).png") as ImageSourcePropType,
  },
  {
    title: "For you, to share if you want",
    description: "Private by default, share or make discoverable.",
    imageUrl:
      require("../assets/Miroodles - Color Comp (2).png") as ImageSourcePropType,
  },
  {
    title: "We're here to help",
    description: "Soonlist is new, and we're working to make it better.",
    imageUrl:
      require("../assets/Miroodles - Color Comp (3).png") as ImageSourcePropType,
  },
  {
    title: "Have an event to capture?",
    description: "Bring it to mind, and we'll wait for you!",
    imageUrl:
      require("../assets/Miroodles - Color Comp (4).png") as ImageSourcePropType,
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
    <View style={{ width: SCREEN_WIDTH, padding: 20 }}>
      <View className="mt-20 items-center space-y-8">
        <Image
          source={item.imageUrl}
          style={{ width: SCREEN_WIDTH - 40, height: SCREEN_WIDTH - 40 }}
          contentFit="contain"
        />
        <Text className="text-center text-3xl font-bold text-neutral-1">
          {item.title}
        </Text>
        <Text className="text-center text-xl text-neutral-2">
          {item.description}
        </Text>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-background">
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
      <View className="absolute bottom-20 left-0 right-0">
        <View className="mb-8 flex-row justify-center space-x-2">
          {storySlides.map((_, index) => (
            <View
              key={index}
              className={`h-2 w-2 rounded-full ${
                index === currentSlide ? "bg-interactive-1" : "bg-neutral-3"
              }`}
            />
          ))}
        </View>
        <View className="px-20">
          <Pressable
            onPress={handleNext}
            className="rounded-full bg-interactive-1 px-6 py-3"
          >
            <Text className="text-center text-lg font-bold text-white">
              {currentSlide < storySlides.length - 1 ? "Next" : "I'm Ready!"}
            </Text>
          </Pressable>
          {currentSlide < storySlides.length - 1 && (
            <Pressable onPress={handleSkip} className="mt-4">
              <Text className="text-center text-lg text-interactive-2">
                Skip
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
