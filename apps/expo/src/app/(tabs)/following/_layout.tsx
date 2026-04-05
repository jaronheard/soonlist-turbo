import React, { useCallback } from "react";
import { Share } from "react-native";
import { Stack } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

import { ProfileMenu } from "~/components/ProfileMenu";

export default function FollowingLayout() {
  const { user } = useUser();
  const username = user?.username;

  const handleShare = useCallback(async () => {
    if (!username) return;
    try {
      await Share.share({
        url: `https://soonlist.com/${username}/my-scene`,
      });
    } catch {
      // ignore
    }
  }, [username]);

  return (
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
          title: "My Scene",
          unstable_headerRightItems: () => [
            {
              type: "button",
              label: "",
              icon: { type: "sfSymbol", name: "square.and.arrow.up" },
              onPress: () => void handleShare(),
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
