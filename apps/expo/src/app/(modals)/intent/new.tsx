import React from "react";
import { Image, Text, View } from "react-native";

import { Logo } from "~/components/Logo";

export default function IntentLoadingScreen() {
  return (
    <View className="flex-1 bg-interactive-3">
      <View className="flex-1 items-center justify-center px-4">
        <Logo className="mb-8 h-12 w-48" />
        <Text className="mb-4 text-center font-heading text-5xl font-bold text-gray-700">
          Creating <Text className="text-interactive-1">new event</Text>
        </Text>
        <Text className="mb-8 text-center text-xl text-gray-500">
          We're processing your new event. Just a moment...
        </Text>
        <Image
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          source={require("../../../assets/onboarding-events-collage.png")}
          className="mb-6 h-80 w-full"
          resizeMode="contain"
        />
        <Text className="mb-8 text-center text-lg text-gray-600">
          Soonlist is preparing to add your exciting new event.
        </Text>
      </View>
    </View>
  );
}
