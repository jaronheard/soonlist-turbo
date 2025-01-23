import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ChevronDown, Plus } from "lucide-react-native";

export default function DemoIntroScreen() {
  const translateY = useSharedValue(0);

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
      top: -16, // position above the button
      left: "50%",
      transform: [
        { translateX: -32 }, // half of the chevron size to center it
        { translateY: translateY.value },
      ],
      zIndex: 10,
    };
  });

  return (
    <View className="flex-1 bg-interactive-2">
      <View className="flex-1 items-center justify-center px-4">
        <Text className="mb-8 text-center text-3xl font-bold text-black">
          Here's how it works
        </Text>
        <View className="mb-12 w-full gap-3">
          <View className="rounded-xl border-2 border-accent-blue/30 p-4">
            <Text className="text-xl font-bold text-black">
              1️⃣ Screenshot events you see
            </Text>
          </View>
          <View className="rounded-xl border-2 border-accent-orange/30 p-4">
            <Text className="text-xl font-bold text-black">
              2️⃣ Add photos to Soonlist
            </Text>
          </View>
          <View className="rounded-xl border-2 border-accent-green/30 p-4">
            <Text className="text-xl font-bold text-black">
              3️⃣ See all your possibilities
            </Text>
          </View>
          <Text className="mt-8 text-center text-3xl font-bold text-black">
            Try it now!
          </Text>
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

        <TouchableOpacity
          onPress={() => router.push("/onboarding/demo-capture")}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex-row items-center justify-center rounded-full bg-[#5A32FB] p-6 shadow-lg"
        >
          <Plus size={28} color="#E0D9FF" />
        </TouchableOpacity>
        <Animated.View style={animatedStyle}>
          <ChevronDown size={64} color="#000" strokeWidth={4} />
        </Animated.View>
      </View>
    </View>
  );
}
