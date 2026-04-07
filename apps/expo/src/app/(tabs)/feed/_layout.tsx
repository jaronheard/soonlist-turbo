import React, { useCallback } from "react";
import { Share, View } from "react-native";
import { Stack } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

import { CaptureOverlayButton } from "~/components/CaptureOverlayButton";
import { ProfileMenu } from "~/components/ProfileMenu";
import Config from "~/utils/config";
import { logError } from "~/utils/errorLogging";

export default function FeedLayout() {
  const { user } = useUser();

  const handleShareEvents = useCallback(async () => {
    const shareUrl = `${Config.apiBaseUrl}/${user?.username ?? ""}`;
    try {
      await Share.share({ url: shareUrl });
    } catch (error) {
      logError("Error sharing events", error);
    }
  }, [user?.username]);

  return (
    <View className="flex-1">
      <Stack
        screenOptions={{
          headerLargeTitle: true,
          headerLargeTitleStyle: { color: "#5A32FB" },
          headerTintColor: "#5A32FB",
          headerShadowVisible: false,
          headerTransparent: true,
          headerBlurEffect: "none",
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "My Soonlist",
            unstable_headerRightItems: () => [
              {
                type: "button",
                label: "",
                icon: { type: "sfSymbol", name: "square.and.arrow.up" },
                onPress: () => void handleShareEvents(),
                accessibilityLabel: "Share",
                tintColor: "#5A32FB",
              },
              {
                type: "custom",
                element: <ProfileMenu />,
                hidesSharedBackground: true,
              },
            ],
          }}
        />
      </Stack>
      <CaptureOverlayButton />
    </View>
  );
}
