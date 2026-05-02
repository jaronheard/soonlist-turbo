import React from "react";
import { Stack } from "expo-router";

import { ProfileMenu } from "~/components/ProfileMenu";
import { useShareMyList } from "~/hooks/useShareMyList";
import { HEADER_BLUR_EFFECT } from "~/utils/headerOptions";

export default function FeedLayout() {
  const { requestShare } = useShareMyList();

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
  );
}
