import React, { useRef, useState } from "react";
import { Dimensions, FlatList, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import { useAppStore } from "~/store";

interface StorySlide {
  title: string;
  description: string;
  imageUrl: string;
}

const storySlides: StorySlide[] = [
  {
    title: "Capture everything you see.",
    description:
      "Whether it's a concert, a hangout, or a special event, capture it all.",
    imageUrl: "placeholder_image_1.png",
  },
  {
    title: "See it all in one place",
    description: "Automatically organized, always accessible.",
    imageUrl: "placeholder_image_2.png",
  },
  {
    title: "For you, to share if you want",
    description: "Keep private, share with a friend, or make discoverable.",
    imageUrl: "placeholder_image_3.png",
  },
  {
    title: "We're here to help",
    description: "Soonlist is new, and we're working to make it better.",
    imageUrl: "placeholder_image_4.png",
  },
  {
    title: "Do you have an event to capture?",
    description: "Bring to mind the last interesting event you saw.",
    imageUrl: "placeholder_image_5.png",
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
      router.replace("/add-event");
    }
  };

  const handleSkip = () => {
    setHasCompletedOnboarding(true);
    router.replace("/feed");
  };

  const renderSlide = ({ item }: { item: StorySlide }) => (
    <View style={{ width: SCREEN_WIDTH, padding: 20 }}>
      <View className="items-center space-y-8">
        <Image
          source={item.imageUrl}
          style={{ width: SCREEN_WIDTH - 40, height: SCREEN_WIDTH - 40 }}
          contentFit="contain"
          className="mb-4"
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
              {currentSlide < storySlides.length - 1 ? "Next" : "Get Started"}
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
