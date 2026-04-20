import React from "react";
import { View } from "react-native";
import { Stack } from "expo-router";

import { CaptureOverlayButton } from "~/components/CaptureOverlayButton";
import { ProfileMenu } from "~/components/ProfileMenu";
import { useShareMyList } from "~/hooks/useShareMyList";

export default function FeedLayout() {
  const { requestShare } = useShareMyList();

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
                onPress: () => requestShare(),
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
