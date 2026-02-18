import React from "react";
import {
  DynamicColorIOS,
  PlatformColor,
  Pressable,
  Share,
  Text,
  View,
} from "react-native";
import { SymbolView } from "expo-symbols";

import { NativeSegmentedControl } from "~/components/NativeSegmentedControl";
import { ProfileMenu } from "~/components/ProfileMenu";
import { logError } from "~/utils/errorLogging";

type TabType = "list" | "board";

interface TabHeaderProps {
  type: TabType;
  displayName: string;
  username: string;
  filter: "upcoming" | "past";
  onFilterChange: (value: "upcoming" | "past") => void;
}

export function TabHeader({
  type,
  displayName,
  username,
  filter,
  onFilterChange,
}: TabHeaderProps) {
  const title =
    type === "list" ? `${displayName}'s Soonlist` : `${displayName}'s Board`;
  const subtitlePath = type === "list" ? username : `${username}/board`;
  const shareUrl = `https://soonlist.com/${subtitlePath}`;

  return (
    <View className="px-4 pb-3">
      <View className="mb-4 flex-row items-center justify-between">
        <ProfileMenu />

        <View className="mx-3 flex-1">
          <Text
            className="text-lg font-semibold text-neutral-1"
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text className="text-xs text-neutral-2" numberOfLines={1}>
            soonlist.com/{subtitlePath}
          </Text>
        </View>

        <Pressable
          onPress={() => {
            Share.share({ url: shareUrl }).catch((error) => {
              logError("Error sharing tab header URL", error);
            });
          }}
          style={{
            backgroundColor: DynamicColorIOS({
              light: "#FFFFFF",
              dark: "#1F1F1F",
            }),
          }}
          className="size-10 items-center justify-center rounded-full"
        >
          <SymbolView
            name="square.and.arrow.up"
            size={18}
            tintColor={PlatformColor("label")}
            type="hierarchical"
          />
        </Pressable>
      </View>

      <NativeSegmentedControl value={filter} onChange={onFilterChange} />
    </View>
  );
}
