import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { toast } from "sonner-native";

import { DemoProgressBar } from "~/components/DemoProgressBar";
import { Camera, ChevronDown, List, Plus, Sparkles } from "~/components/icons";
import { SkipDemoButton } from "~/components/SkipDemoButton";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

export default function DemoIntroScreen() {
  const translateY = useSharedValue(0);
  const [isLoading, setIsLoading] = useState(false);

  // Start the animation immediately
  translateY.value = withRepeat(
    withTiming(-12, {
      duration: 500,
      easing: Easing.inOut(Easing.sin),
    }),
    -1,
    true,
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      position: "absolute",
      top: -16,
      left: "50%",
      transform: [{ translateX: -32 }, { translateY: translateY.value }],
      zIndex: 10,
    };
  });

  const handlePress = () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      router.push("/onboarding/demo-capture");
    } catch (error) {
      toast.error("Something went wrong", {
        description: "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-interactive-3" edges={["top"]}>
      <DemoProgressBar
        currentStep={8}
        totalSteps={TOTAL_ONBOARDING_STEPS}
        variant="light"
      />
      <View className="flex-1 px-4 ">
        <Text className="my-6 text-center text-4xl font-bold text-black">
          How it works
        </Text>
        <View className="mb-12 flex w-full flex-col space-y-4">
          <View className="flex-row items-center rounded-2xl bg-interactive-3 p-6">
            <View className="mr-4 rounded-full bg-accent-green/30 p-3">
              <Camera size={28} color="#5A32FB" />
            </View>
            <View>
              <Text className="text-2xl font-bold text-black">
                See & screenshot
              </Text>
            </View>
          </View>

          <View className="flex-row items-center rounded-2xl bg-interactive-3 p-6">
            <View className="mr-4 rounded-full bg-accent-orange/30 p-3">
              <Sparkles size={28} color="#5A32FB" />
            </View>
            <View>
              <Text className="text-2xl font-bold text-black">
                Capture events to Soonlist
              </Text>
            </View>
          </View>

          <View className="flex-row items-center rounded-2xl bg-interactive-3 p-6">
            <View className="mr-4 rounded-full bg-accent-blue/30 p-3">
              <List size={28} color="#5A32FB" />
            </View>
            <View>
              <Text className="text-2xl font-bold text-black">
                See all your possibilities
              </Text>
            </View>
          </View>
        </View>
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

        <View className="absolute bottom-48 left-1/2 flex -translate-x-1/2 flex-col items-center space-y-2">
          <Text className="w-min rounded-2xl bg-accent-yellow px-4 py-2 text-center text-2xl font-semibold text-neutral-1">
            Try adding an event
          </Text>

          <SkipDemoButton />
        </View>

        <TouchableOpacity
          onPress={handlePress}
          disabled={isLoading}
          className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex-row items-center justify-center rounded-full ${isLoading ? "bg-[#5A32FB]/50" : "bg-[#5A32FB]"} p-6 shadow-lg`}
        >
          <Plus size={28} color="#E0D9FF" />
        </TouchableOpacity>

        <Animated.View style={animatedStyle}>
          <ChevronDown size={64} color="#5A32FB" strokeWidth={4} />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
