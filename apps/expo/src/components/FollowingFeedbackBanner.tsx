import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import * as Haptics from "expo-haptics";
import Intercom from "@intercom/intercom-react-native";
import { usePostHog } from "posthog-react-native";

import { MessageSquare } from "~/components/icons";
import { logError } from "~/utils/errorLogging";

const FollowingFeedbackBanner: React.FC = () => {
  const posthog = usePostHog();

  const handleFeedback = async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      posthog.capture("following_feedback_initiated", {
        source: "following_banner",
      });

      await Intercom.present();
    } catch (error) {
      posthog.capture("following_feedback_error", {
        source: "following_banner",
        error_message: (error as Error).message,
      });
      logError("Error presenting Intercom from Following banner", error);
    }
  };

  return (
    <View>
      <TouchableOpacity
        onPress={handleFeedback}
        accessibilityRole="button"
        accessibilityLabel="Give feedback on Following feature"
      >
        <View
          className="mx-4 rounded-2xl bg-accent-yellow/80 p-4"
          style={{
            borderWidth: 3,
            borderColor: "white",
            shadowColor: "#5A32FB",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15,
            shadowRadius: 2.5,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center">
              <Text className="mr-1 text-lg">✨</Text>
              <Text className="flex-1 text-lg font-semibold text-neutral-1">
                New! Follow lists
              </Text>
            </View>
            <View className="flex-row items-center gap-2 rounded-full bg-interactive-1 px-4 py-2">
              <MessageSquare size={18} color="#FFFFFF" />
              <Text className="text-lg font-bold text-white">Feedback</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default FollowingFeedbackBanner;
