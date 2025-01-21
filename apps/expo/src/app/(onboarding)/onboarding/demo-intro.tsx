import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ArrowUp } from "lucide-react-native";

import { useAppStore } from "~/store";

export default function DemoIntroScreen() {
  const userPriority = useAppStore((state) => state.userPriority);

  const getPriorityMessage = () => {
    if (userPriority?.includes("connections")) {
      return "Having all your possibilities in one place will help you make more meaningful connections";
    }
    if (userPriority?.includes("out more")) {
      return "Having all your possibilities in one place will help you get out more";
    }
    if (userPriority?.includes("best event")) {
      return "Having all your possibilities in one place will help you choose the best events";
    }
    if (userPriority?.includes("planning")) {
      return "Having all your possibilities in one place will help you plan more flexibly";
    }
    if (userPriority?.includes("community")) {
      return "Having all your possibilities in one place will help you build more community";
    }
    return "Having all your possibilities in one place will help you do more of what matters";
  };

  return (
    <View className="flex-1 bg-interactive-2">
      <View className="flex-1 items-center justify-center px-4">
        <Text className="mb-4 text-center text-4xl font-bold text-black">
          💖 We got you
        </Text>
        <Text className="mb-12 text-center text-2xl text-black">
          {getPriorityMessage()}
        </Text>
        <Text className="text-center text-xl font-semibold text-black">
          Try it now
        </Text>
      </View>

      <View className="h-40">
        <View className="absolute bottom-0 h-24 w-full">
          <BlurView
            intensity={10}
            className="h-full w-full opacity-20"
            tint="light"
          />
        </View>

        <View className="absolute bottom-0 h-40 w-full">
          <LinearGradient
            colors={["transparent", "#5A32FB"]}
            locations={[0, 1]}
            style={{
              position: "absolute",
              height: "100%",
              width: "100%",
              opacity: 0.3,
            }}
          />
          <LinearGradient
            colors={["transparent", "#E0D9FF"]}
            locations={[0, 1]}
            style={{
              position: "absolute",
              height: "100%",
              width: "100%",
              opacity: 0.1,
            }}
          />
        </View>

        <TouchableOpacity
          onPress={() => router.push("/onboarding/demo-capture")}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex-row items-center justify-center rounded-full bg-[#E0D9FF] p-6 shadow-lg"
        >
          <ArrowUp size={28} color="#5A32FB" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
