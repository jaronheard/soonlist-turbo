import React, { useCallback } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { usePostHog } from "posthog-react-native";

import { CaptureOverlayButton } from "~/components/CaptureOverlayButton";
import { ProfileMenu } from "~/components/ProfileMenu";
import { shareOwnList } from "~/utils/shareOwnList";

export default function FeedLayout() {
  const { user } = useUser();
  const posthog = usePostHog();

  const handleShareEvents = useCallback(async () => {
    await shareOwnList({
      username: user?.username,
      posthog,
      source: "header",
    });
  }, [posthog, user?.username]);

  return (
    <View style={{ flex: 1 }}>
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
