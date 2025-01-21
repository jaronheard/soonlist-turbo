import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

export default function DemoIntroScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-4 pt-8">
        <Text className="mb-4 text-center text-2xl font-bold">
          Try Soonlist
        </Text>
        <Text className="mb-8 text-center text-base text-neutral-600">
          Let's try out Soonlist with a quick demo. You'll be able to:
        </Text>

        <View className="space-y-4 px-4">
          <View className="flex-row items-start space-x-2">
            <Text className="text-xl font-bold text-interactive-1">1.</Text>
            <Text className="flex-1 text-base">
              Browse through some example events
            </Text>
          </View>

          <View className="flex-row items-start space-x-2">
            <Text className="text-xl font-bold text-interactive-1">2.</Text>
            <Text className="flex-1 text-base">
              Select an event you're interested in
            </Text>
          </View>

          <View className="flex-row items-start space-x-2">
            <Text className="text-xl font-bold text-interactive-1">3.</Text>
            <Text className="flex-1 text-base">
              See it appear in your demo feed
            </Text>
          </View>

          <View className="flex-row items-start space-x-2">
            <Text className="text-xl font-bold text-interactive-1">4.</Text>
            <Text className="flex-1 text-base">
              View event details and finish the demo
            </Text>
          </View>
        </View>
      </View>

      <View className="px-4 pb-8">
        <TouchableOpacity
          onPress={() => router.push("/onboarding/demo-capture")}
          className="rounded-lg bg-interactive-1 p-4"
        >
          <Text className="text-center text-base font-semibold text-white">
            Start Demo
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
