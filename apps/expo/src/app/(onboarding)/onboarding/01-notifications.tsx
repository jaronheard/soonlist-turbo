import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { router } from "expo-router";
import { ChevronUp } from "lucide-react-native";
import { toast } from "sonner-native";

import { QuestionContainer } from "~/components/QuestionContainer";
import { useOnboarding } from "~/hooks/useOnboarding";
import { useOneSignal } from "~/providers/OneSignalProvider";
import { TOTAL_ONBOARDING_STEPS } from "../_layout";

export default function NotificationsScreen() {
  const { registerForPushNotifications, hasNotificationPermission } =
    useOneSignal();
  const { saveStep } = useOnboarding();
  const translateY = useSharedValue(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(-12, {
        duration: 500,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [translateY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      position: "absolute",
      left: "25%",
      top: "100%",
      paddingLeft: 8,
      paddingTop: 0,
      transform: [{ translateY: translateY.value }],
    };
  });

  const handleNotificationPermission = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      if (hasNotificationPermission) {
        toast.success("Notifications already enabled", {
          action: {
            label: "Continue",
            onClick: () => {
              router.push("/onboarding/02-age");
              toast.dismiss();
            },
          },
        });
        setIsLoading(false);
        return;
      }

      // Request permissions and get the result
      const isPermissionGranted = await registerForPushNotifications();

      // Save the step with the permission result
      saveStep(
        "notifications",
        {
          notificationsEnabled: isPermissionGranted,
        },
        "/onboarding/02-age",
      );
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
      question=""
      currentStep={1}
      totalSteps={TOTAL_ONBOARDING_STEPS}
    >
      <View className="mx-12 -mt-24 flex-1 items-center justify-center">
        <View className="relative">
          <View className="rounded-2xl bg-white">
            <View className="px-2 pb-3 pt-4">
              <Text className="mb-2 px-4 text-center text-xl font-semibold leading-6">
                Turn on Push Notifications to capture and remember.
              </Text>
              <Text className="mb-2 px-4 text-center text-sm leading-5">
                Soonlist notifies you when events are created, and to help you
                build a habit of capturing events.
              </Text>
            </View>
            <View className="flex-row border-t border-[#3c3c43]/30">
              <Pressable className="w-1/2 py-3" disabled>
                <Text className="text-center text-lg font-normal text-blue-500/30">
                  Don't Allow
                </Text>
              </Pressable>
              <View className="w-1/2">
                <Pressable
                  className="w-full border-l border-[#3c3c43]/30 py-3"
                  onPress={handleNotificationPermission}
                  hitSlop={40}
                  disabled={isLoading}
                >
                  <Text
                    className={`text-center text-lg font-bold ${
                      isLoading ? "text-blue-500/50" : "text-blue-500"
                    }`}
                  >
                    {isLoading ? "Loading..." : "Allow"}
                  </Text>
                </Pressable>
                <Animated.View style={animatedStyle}>
                  <ChevronUp size={64} color="#FFF" strokeWidth={4} />
                </Animated.View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </QuestionContainer>
  );
}
