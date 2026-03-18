import React, { useCallback } from "react";
import { Share } from "react-native";
import { Stack } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

import { ProfileMenu } from "~/components/ProfileMenu";
import { useAppStore } from "~/store";
import Config from "~/utils/config";
import { logError } from "~/utils/errorLogging";

export default function FeedLayout() {
  const { user } = useUser();
  const myListLabel = useAppStore((s) => s.myListLabel);
  const headerStyle = useAppStore((s) => s.headerStyle);

  // Strip "My " prefix to get the base noun: "My List" → "List", "My Soonlist" → "Soonlist"
  const baseNoun = myListLabel.replace(/^My\s+/, "");

  const headerTitle = (() => {
    switch (headerStyle) {
      case "possessive":
        return user?.firstName
          ? `${user.firstName}'s ${baseNoun}`
          : `My ${baseNoun}`;
      case "my":
        return `My ${baseNoun}`;
      case "your":
        return `Your ${baseNoun}`;
      case "plain":
        return baseNoun;
    }
  })();

  const handleShareEvents = useCallback(async () => {
    const shareUrl = `${Config.apiBaseUrl}/${user?.username ?? ""}`;
    try {
      await Share.share({ url: shareUrl });
    } catch (error) {
      logError("Error sharing events", error);
    }
  }, [user?.username]);

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
  );
}
