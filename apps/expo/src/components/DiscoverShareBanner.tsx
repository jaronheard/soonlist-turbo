import React from "react";
import { Share, Text, TouchableOpacity, View } from "react-native";
import * as Haptics from "expo-haptics";
import { usePostHog } from "posthog-react-native";

import { ShareIcon } from "~/components/icons";
import { logError } from "~/utils/errorLogging";

const DiscoverShareBanner: React.FC = () => {
  const posthog = usePostHog();

  const handleShare = async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const appStoreUrl =
      "https://apps.apple.com/us/app/soonlist-save-events-instantly/id6670222216";
    const shareMessage = `Hey, check out Soonlist. It turns your screenshots into saved plans and makes finding and sharing events way easier. 🗓️✨

Use code DISCOVER to join the Portland-only, invite-only Discover list with events from me and 50+ others.`;

    try {
      // Track invite initiated
      posthog.capture("invite_friend_initiated", {
        source: "discover_banner",
        action: "bring_a_friend",
      });

      const result = await Share.share({
        message: shareMessage,
        url: appStoreUrl,
        title: "Soonlist — Discover events",
      });

      // Track invite completed if user didn't dismiss
      if (result.action === Share.sharedAction) {
        posthog.capture("invite_friend_completed", {
          source: "discover_banner",
          action: "bring_a_friend",
        });
      } else if (result.action === Share.dismissedAction) {
        posthog.capture("invite_friend_dismissed", {
          source: "discover_banner",
          action: "bring_a_friend",
        });
      }
    } catch (error) {
      posthog.capture("invite_friend_error", {
        source: "discover_banner",
        error_message: (error as Error).message,
      });
      logError("Error sharing Discover feed", error);
    }
  };

  return (
    <View className="mb-3 mt-2">
      <TouchableOpacity
        onPress={handleShare}
        accessibilityRole="button"
        accessibilityLabel="Invite a friend to Discover"
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
              <Text className="mr-1 text-lg">👯</Text>
              <Text className="flex-1 text-lg font-semibold text-neutral-1">
                Bring a friend into Discover
              </Text>
            </View>
            <View className="flex-row items-center gap-2 rounded-full bg-interactive-1 px-4 py-2">
              <ShareIcon size={18} color="#FFFFFF" />
              <Text className="text-lg font-bold text-white">Invite</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default DiscoverShareBanner;
