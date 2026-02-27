import React, { useCallback } from "react";
import { Share } from "react-native";
import { Stack } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

import { ProfileMenu } from "~/components/ProfileMenu";
import { useAppStore } from "~/store";

export default function FollowingLayout() {
  const { user } = useUser();
  const boardLabel = useAppStore((s) => s.boardLabel);
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
