import React from "react";
import { Stack } from "expo-router";

import { ProfileMenu } from "~/components/ProfileMenu";
import { HEADER_BLUR_EFFECT } from "~/utils/headerOptions";

export default function FollowingLayout() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerLargeTitleInline: true,
        headerLargeTitleStyle: { color: "#5A32FB" },
        headerTintColor: "#5A32FB",
        headerShadowVisible: false,
        headerTransparent: true,
        headerBlurEffect: HEADER_BLUR_EFFECT,
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
  );
}
