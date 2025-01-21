import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ArrowRight } from "lucide-react-native";

export default function DemoIntroScreen() {
  return (
    <View className="flex-1 bg-interactive-2">
      <View className="flex-1 items-center justify-center px-4">
        <Text className="mb-4 text-center text-4xl font-bold text-black">
          💖 We got you
        </Text>
        <Text className="mb-12 text-center text-2xl text-black">
          Just screenshot events you like{"\n"}and add them to Soonlist
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
          <ArrowRight size={28} color="#5A32FB" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
