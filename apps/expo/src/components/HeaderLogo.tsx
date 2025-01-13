import React from "react";
import { Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Image } from "expo-image";
import { router, usePathname } from "expo-router";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function HeaderLogo() {
  const pathname = usePathname();
  const rotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handlePress = () => {
    if (pathname === "/feed") {
      // Quick playful wiggle
      rotation.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    } else {
      router.push("/feed");
    }
  };

  return (
    <AnimatedPressable onPress={handlePress} style={animatedStyle}>
      <Image
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        source={require("../assets/icon.png")}
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
        }}
        contentFit="contain"
        cachePolicy="disk"
        transition={100}
      />
    </AnimatedPressable>
  );
}
