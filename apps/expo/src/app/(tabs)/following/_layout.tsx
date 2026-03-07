import React, { useCallback } from "react";
import { Share } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

import { ProfileMenu } from "~/components/ProfileMenu";
import { useAppStore } from "~/store";

export default function FollowingLayout() {
  const { user } = useUser();
  const router = useRouter();
  const boardLabel = useAppStore((s) => s.boardLabel);
  const followingIcon = useAppStore((s) => s.followingIcon);
  const headerStyle = useAppStore((s) => s.headerStyle);

  // URL path matches the board label
  const boardUrlPath = boardLabel.toLowerCase().replace(/\s+/g, "-");

  const headerTitle = (() => {
    switch (headerStyle) {
      case "possessive":
        return user?.firstName
          ? `${user.firstName}'s ${boardLabel}`
          : `My ${boardLabel}`;
      case "my":
        return `My ${boardLabel}`;
      case "your":
        return `Your ${boardLabel}`;
      case "plain":
        return boardLabel;
    }
  })();

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        url: `https://soonlist.com/${user?.username ?? ""}/${boardUrlPath}`,
      });
    } catch {
      // ignore
    }
  }, [user?.username, boardUrlPath]);

  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerLargeTitleStyle: { color: "#5A32FB" },
        headerTintColor: "#5A32FB",
        headerShadowVisible: false,
        headerTransparent: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: headerTitle,
          unstable_headerRightItems: () => [
            {
              type: "button",
              label: "",
              icon: { type: "sfSymbol", name: followingIcon },
              onPress: () => router.push("/(tabs)/following/manage"),
              accessibilityLabel: "Manage following",
              tintColor: "#5A32FB",
              hidesSharedBackground: true,
            },
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
      <Stack.Screen
        name="manage"
        options={{
          title: "Following",
          headerLargeTitle: false,
          headerBackTitle: "Back",
        }}
      />
    </Stack>
  );
}
