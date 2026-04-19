import React, { useCallback, useEffect, useRef } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";

import { FirstShareSetupSheet } from "~/components/FirstShareSetupSheet";
import { useShareMyList } from "~/hooks/useShareMyList";
import { useSetShareListPromptSeen } from "~/store";

export default function SharePromptSheet() {
  const posthog = usePostHog();
  const markSeen = useSetShareListPromptSeen();
  const {
    requestShare,
    isSetupSheetVisible,
    closeSetupSheet,
    closeSetupSheetAndShare,
  } = useShareMyList();

  const actionRef = useRef<"share" | "not_now" | "swipe">("swipe");

  useEffect(() => {
    posthog.capture("share_prompt_one_shot_shown");
    return () => {
      if (actionRef.current === "swipe") {
        posthog.capture("share_prompt_one_shot_dismissed", { method: "swipe" });
      }
      markSeen();
    };
  }, [markSeen, posthog]);

  const handleShare = useCallback(() => {
    actionRef.current = "share";
    posthog.capture("share_prompt_one_shot_share_tapped");
    requestShare();
  }, [posthog, requestShare]);

  const handleNotNow = useCallback(() => {
    actionRef.current = "not_now";
    posthog.capture("share_prompt_one_shot_dismissed", {
      method: "not_now_button",
    });
    router.back();
  }, [posthog]);

  // When the first-share setup sheet closes (either completes a share or is
  // cancelled), pop the share-prompt route too.
  const handleSetupClose = useCallback(() => {
    closeSetupSheet();
    router.back();
  }, [closeSetupSheet]);

  const handleSetupComplete = useCallback(async () => {
    await closeSetupSheetAndShare();
    router.back();
  }, [closeSetupSheetAndShare]);

  // If the user has already shared before, requestShare skips the setup sheet
  // and opens native share directly — pop ourselves in that case.
  useEffect(() => {
    if (actionRef.current === "share" && !isSetupSheetVisible) {
      router.back();
    }
  }, [isSetupSheetVisible]);

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 24,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text className="text-center font-heading text-2xl font-bold text-neutral-1">
          Your Soonlist is ready to share
        </Text>
        <Text
          className="text-center text-base text-neutral-2"
          style={{ marginTop: 8 }}
        >
          Send your upcoming events to friends.
        </Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: 16, gap: 4 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share your Soonlist"
          onPress={handleShare}
          className="items-center rounded-full bg-interactive-1"
          style={({ pressed }) => ({
            height: 52,
            justifyContent: "center",
            opacity: pressed ? 0.85 : 1,
            shadowColor: "#5A32FB",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 4,
          })}
        >
          <Text className="text-base font-semibold text-white">Share</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Not now"
          onPress={handleNotNow}
          style={({ pressed }) => ({
            height: 44,
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text className="text-center text-base font-medium text-neutral-2">
            Not now
          </Text>
        </Pressable>
      </View>

      <FirstShareSetupSheet
        visible={isSetupSheetVisible}
        onClose={handleSetupClose}
        onComplete={handleSetupComplete}
      />
    </View>
  );
}
