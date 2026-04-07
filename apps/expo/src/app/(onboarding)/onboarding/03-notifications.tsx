import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { router } from "expo-router";

import { ChevronUp } from "~/components/icons";
import { QuestionContainer } from "~/components/QuestionContainer";
import { useOnboarding } from "~/hooks/useOnboarding";
import { useOneSignal } from "~/providers/OneSignalProvider";
import { usePendingFollowUsername } from "~/store";
import { cn } from "~/utils/cn";
import { logError } from "~/utils/errorLogging";
import { hapticLight, toast } from "~/utils/feedback";

export default function NotificationsScreen() {
  const { registerForPushNotifications, hasNotificationPermission } =
    useOneSignal();
  const { saveStep } = useOnboarding();
  const pendingFollowUsername = usePendingFollowUsername();
  const translateY = useSharedValue(0);
  const [isLoading, setIsLoading] = useState(false);

  const totalSteps = pendingFollowUsername ? 7 : 6;
  const currentStep = pendingFollowUsername ? 4 : 3;

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
    void hapticLight();
    setIsLoading(true);

    try {
      if (hasNotificationPermission) {
        // Already has permission, just continue
        router.navigate("/(onboarding)/onboarding/04-paywall");
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
        "/(onboarding)/onboarding/04-paywall",
      );
    } catch (error) {
      logError("Failed to save notifications", error);
      toast.error("Something went wrong", "Please try again");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <QuestionContainer
      question="Stay in the loop"
      subtitle="Know when events are saved and lists are updated"
      currentStep={currentStep}
      totalSteps={totalSteps}
    >
      <View className="flex-1">
        <View className="flex-1 items-center justify-center px-12">
          <View
            className="relative overflow-hidden rounded-[14px]"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <BlurView
              tint="systemUltraThinMaterialLight"
              intensity={100}
              style={{
                borderRadius: 14,
                overflow: "hidden",
                backgroundColor: "rgba(255,255,255,0.75)",
              }}
            >
              <View className="px-4 pb-4 pt-5">
                <Text className="mb-1 text-center text-[17px] font-semibold leading-[22px] text-black">
                  Allow {'"'}Soonlist{'"'} to send you notifications?
                </Text>
                <Text className="mt-1 text-center text-[13px] leading-[18px] text-black/50">
                  Soonlist will notify you when events are saved and with
                  updates from shared lists
                </Text>
              </View>
              <View className="h-[0.5px] bg-[rgba(60,60,67,0.36)]" />
              <View className="h-[44px] flex-row">
                <Pressable
                  className="flex-1 items-center justify-center"
                  disabled
                >
                  <Text className="text-[17px] font-normal text-blue-500/30">
                    Don{"'"}t Allow
                  </Text>
                </Pressable>
                <View className="w-[0.5px] bg-[rgba(60,60,67,0.36)]" />
                <View className="flex-1">
                  <Pressable
                    className="flex-1 items-center justify-center"
                    onPress={handleNotificationPermission}
                    hitSlop={40}
                    disabled={isLoading}
                  >
                    <Text
                      className={cn(
                        "text-[17px] font-semibold",
                        isLoading ? "text-blue-500/50" : "text-blue-500",
                      )}
                    >
                      {isLoading ? "Loading..." : "Allow"}
                    </Text>
                  </Pressable>
                  <Animated.View style={animatedStyle}>
                    <ChevronUp size={64} color="#FFF" strokeWidth={4} />
                  </Animated.View>
                </View>
              </View>
            </BlurView>
          </View>
        </View>

        <Text className="px-6 pb-4 text-center text-sm text-white/60">
          You can always update this later in your settings!
        </Text>
      </View>
    </QuestionContainer>
  );
}
