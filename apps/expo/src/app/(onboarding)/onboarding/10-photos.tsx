import React, { useEffect, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { toast } from "sonner-native";

import { QuestionContainer } from "~/components/QuestionContainer";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

export default function PhotosScreen() {
  const translateX = useSharedValue(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(-12, {
        duration: 500,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    position: "absolute",
    right: "-25%",
    top: "50%",
    transform: [
      { translateX: translateX.value },
      { translateY: -32 }, // half of the chevron size to center it
    ],
  }));

  const handlePhotoPermission = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const { status, canAskAgain } =
        await ImagePicker.getMediaLibraryPermissionsAsync();

      if (status === ImagePicker.PermissionStatus.GRANTED) {
        toast.success("Photo access already enabled", {
          action: {
            label: "Continue",
            onClick: () => {
              router.push("/onboarding/demo-intro");
              toast.dismiss();
            },
          },
        });
        setIsLoading(false);
        return;
      }

      if (!canAskAgain) {
        toast.error("Photo access required", {
          description: "Please enable photo access in your device settings.",
          action: {
            label: "Settings",
            onClick: () => {
              void Linking.openSettings();
            },
          },
          duration: Infinity,
        });
        setIsLoading(false);
        return;
      }

      await ImagePicker.requestMediaLibraryPermissionsAsync();
      router.push("/onboarding/demo-intro");
    } catch (error) {
      toast.error("Something went wrong", {
        description: "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <QuestionContainer
      question="Enable Photo Access"
      currentStep={10}
      totalSteps={TOTAL_ONBOARDING_STEPS}
    >
      <View className="-mt-16 flex-1 items-center justify-center px-12">
        <View className="w-full max-w-sm rounded-[28px] bg-interactive-3 p-6">
          <Text className="text-center text-xl font-semibold leading-6">
            Enable Full Access to save events instantly
          </Text>
          <Text className="mt-1 text-center text-sm">
            Soonlist is faster with full access.
          </Text>
          {/* Placeholder Image Grid */}
          <View className="-mx-6 mt-2 flex-row flex-wrap bg-white">
            {Array.from({ length: 8 }).map((_, i) => (
              <View
                key={i}
                className="h-20 w-1/4 bg-gray-100"
                style={{
                  borderRightWidth: i % 4 !== 3 ? 1 : 0,
                  borderBottomWidth: i < 4 ? 1 : 0,
                  borderColor: "white",
                }}
              />
            ))}
          </View>

          <View className="-mx-6 -mt-2 rounded-xl px-4 py-4">
            <Text className="text-center text-sm font-bold">
              Full access is recommended
            </Text>
            <Text className="mt-1 text-center text-sm leading-5">
              Full access makes it faster to save events. We only capture photos
              you select.
            </Text>
          </View>

          <View className="-mx-6 -mb-6 mt-2">
            <Pressable
              disabled
              className="w-full border-b border-t border-gray-200 py-3"
            >
              <Text className="text-center text-lg font-normal text-blue-500/30">
                Limit Access...
              </Text>
            </Pressable>
            <View className="relative">
              <Pressable
                onPress={() => handlePhotoPermission()}
                disabled={isLoading}
                className="w-full border-b border-gray-200 py-3"
              >
                <Text
                  className={`text-center text-lg font-bold ${isLoading ? "text-blue-500/50" : "text-blue-500"}`}
                >
                  {isLoading ? "Loading..." : "Allow Full Access"}
                </Text>
              </Pressable>
              <Animated.View style={animatedStyle}>
                <ChevronLeft size={64} color="#FFF" strokeWidth={4} />
              </Animated.View>
            </View>
            <Pressable disabled className="w-full py-3">
              <Text className="text-center text-lg font-normal text-blue-500/30">
                Don't Allow
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </QuestionContainer>
  );
}
