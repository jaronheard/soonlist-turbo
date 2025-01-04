/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/consistent-type-assertions */
import type { ImageSourcePropType } from "react-native";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { useAppStore } from "~/store";

interface OnboardingSlide {
  id: string;
  image: ImageSourcePropType;
}

const slides: OnboardingSlide[] = [
  { id: "1", image: require("../assets/1b.png") as ImageSourcePropType },
  { id: "2", image: require("../assets/2b.png") as ImageSourcePropType },
  { id: "3", image: require("../assets/3b.png") as ImageSourcePropType },
  { id: "4", image: require("../assets/4b.png") as ImageSourcePropType },
  { id: "5", image: require("../assets/5b.png") as ImageSourcePropType },
  { id: "6", image: require("../assets/6b.png") as ImageSourcePropType },
];

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function StoryOnboarding() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const setHasCompletedOnboarding = useAppStore(
    (state) => state.setHasCompletedOnboarding,
  );

  const completeOnboarding = () => {
    setHasCompletedOnboarding(true);
    router.replace("/feed");
  };

  const renderSlide = ({
    item,
    index,
  }: {
    item: OnboardingSlide;
    index: number;
  }) => (
    <View className="w-screen items-center justify-start pt-10">
      <TouchableOpacity
        onPress={() => {
          if (index === slides.length - 1) {
            completeOnboarding();
          }
        }}
        activeOpacity={index === slides.length - 1 ? 0.8 : 1}
        className="h-[90%] w-[90%] items-center justify-center"
      >
        <Image
          source={item.image}
          className="h-full w-full"
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      completeOnboarding();
    }
  };

  return (
    <View className="flex-1 bg-interactive-2">
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={({
          item,
          index,
        }: {
          item: OnboardingSlide;
          index: number;
        }) => renderSlide({ item, index })}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const slideIndex = Math.round(
            event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
          );
          setCurrentIndex(slideIndex);
        }}
      />
      <View className="absolute bottom-8 left-0 right-0 items-center px-4">
        <View className="mb-5 flex-row justify-center">
          {slides.map((_, index) => (
            <View
              key={index}
              className={`mx-1 h-2 w-2 rounded-full ${
                index === currentIndex ? "bg-white" : "bg-gray-400"
              }`}
            />
          ))}
        </View>
        <View className="w-full flex-row justify-around">
          <TouchableOpacity
            onPress={completeOnboarding}
            className="rounded-full border border-interactive-3 bg-interactive-3 px-3 py-2"
          >
            <Text className="text-base font-semibold text-interactive-1">
              Skip
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleNext}
            className="rounded-full bg-interactive-1 px-3 py-2"
          >
            <Text className="text-base font-semibold text-white">
              {currentIndex < slides.length - 1 ? "Next" : "Get Started"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
