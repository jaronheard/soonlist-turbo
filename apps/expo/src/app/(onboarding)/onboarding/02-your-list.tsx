import React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { QuestionContainer } from "~/components/QuestionContainer";

function FakeEventRow({
  emoji,
  name,
  date,
}: {
  emoji: string;
  name: string;
  date: string;
}) {
  return (
    <View className="flex-row items-center border-b border-gray-100 px-4 py-3">
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-interactive-1/10">
        <Text className="text-lg">{emoji}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-gray-700">{name}</Text>
        <Text className="text-sm text-gray-400">{date}</Text>
      </View>
    </View>
  );
}

export default function YourListScreen() {
  const handleContinue = () => {
    router.navigate("/(onboarding)/onboarding/03-notifications");
  };

  return (
    <QuestionContainer
      question="Share your list with anyone"
      subtitle="Your events become a shareable page — no app needed"
      currentStep={2}
      totalSteps={6}
    >
      <View className="flex-1 justify-between">
        <View className="flex-1 justify-center">
          {/* Fake shareable list card */}
          <View className="mx-2 overflow-hidden rounded-2xl bg-white">
            {/* URL bar */}
            <View className="flex-row items-center bg-gray-50 px-4 py-2.5">
              <View className="mr-2 h-4 w-4 items-center justify-center rounded-full bg-gray-300">
                <Text className="text-[8px] text-white">{"🔒"}</Text>
              </View>
              <Text className="flex-1 text-sm text-gray-500">
                soonlist.com/you/events
              </Text>
            </View>

            {/* Event rows */}
            <FakeEventRow
              emoji={"🎵"}
              name="Rooftop Sunset DJ Set"
              date="Sat, Mar 22 · 6:00 PM"
            />
            <FakeEventRow
              emoji={"🎨"}
              name="Spring Art Walk"
              date="Sat, Mar 22 · 12:00 PM"
            />
            <FakeEventRow
              emoji={"🎭"}
              name="Live Jazz & Open Mic"
              date="Fri, Mar 21 · 8:00 PM"
            />

            {/* Follower avatars */}
            <View className="flex-row items-center px-4 py-3">
              <View className="flex-row -space-x-2">
                <View className="h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-interactive-1">
                  <Text className="text-xs font-bold text-white">A</Text>
                </View>
                <View className="h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-interactive-2">
                  <Text className="text-xs font-bold text-neutral-1">B</Text>
                </View>
                <View className="h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-300">
                  <Text className="text-xs font-bold text-gray-600">C</Text>
                </View>
              </View>
              <Text className="ml-3 text-sm text-gray-500">
                3 followers see your events
              </Text>
            </View>
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
