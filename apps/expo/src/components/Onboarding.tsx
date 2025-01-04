import type { ImageSourcePropType } from "react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  return (
    <View className="flex-1 justify-center bg-white p-4 pb-12">
      <View className="flex-1 justify-center">
        <Text className="mb-4 text-center text-4xl font-bold">
          Welcome to Soonlist! 🎉
        </Text>

        <Image
          source={
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-var-requires
            require("../assets/onboarding-events-collage.png") as ImageSourcePropType
          }
          style={{ width: "100%", height: 160, marginBottom: 24 }}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={100}
        />

        <Text className="mb-6 text-center text-xl">
          Organize your possiblities. Here's what Soonlist does:
        </Text>

        <View className="mb-4">
          <Text className="mb-2 text-xl font-semibold">
            1. Capture events easily 📸
          </Text>
          <Text className="text-base">
            Quickly add events from a screenshot, link, or text.
          </Text>
        </View>

        <View className="mb-4">
          <Text className="mb-2 text-xl font-semibold">
            2. One place for all your possibilities ✨
          </Text>
          <Text className="text-base">
            See every event you've saved in one place.
          </Text>
        </View>

        <View className="mb-4">
          <Text className="mb-2 text-xl font-semibold">
            3. Share with friends 🥳
          </Text>
          <Text className="text-base">
            Easily share your saved events with a link anyone can access.
          </Text>
        </View>

        <Pressable
          onPress={onComplete}
          className="mt-6 rounded-full bg-interactive-1 px-6 py-3"
        >
          <Text className="text-center font-bold text-white">Get Started</Text>
        </Pressable>
      </View>
    </View>
  );
}
