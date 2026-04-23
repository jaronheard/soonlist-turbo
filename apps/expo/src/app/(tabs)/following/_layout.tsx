import React from "react";
import { View } from "react-native";
import { Stack } from "expo-router";

import { CaptureOverlayButton } from "~/components/CaptureOverlayButton";
import { ProfileMenu } from "~/components/ProfileMenu";

export default function FollowingLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerLargeTitle: true,
          headerLargeTitleInline: true,
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
            title: "My Scene",
            unstable_headerRightItems: () => [
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
