import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";

import { User } from "~/components/icons";
import ScenePreviewThreeUp from "~/components/ScenePreviewThreeUp";
import { SubscribeButton } from "~/components/SubscribeButton";

interface SubscribedListRowProps {
  list: Doc<"lists">;
  owner: {
    id: string;
    username: string;
    displayName: string;
    userImage: string | null;
  } | null;
  previewImageUrls: (string | null)[];
  upcomingCount: number;
  hasMoreUpcoming: boolean;
  onPress: () => void;
  onUnsubscribe: () => void;
  isUnsubscribing: boolean;
}

export function SubscribedListRow({
  list,
  owner,
  previewImageUrls,
  upcomingCount,
  hasMoreUpcoming,
  onPress,
  onUnsubscribe,
  isUnsubscribing,
}: SubscribedListRowProps) {
  const displayName = owner?.displayName ?? list.name;
  const upcomingLabel =
    upcomingCount === 1
      ? "1 upcoming event"
      : `${upcomingCount}${hasMoreUpcoming ? "+" : ""} upcoming events`;

  return (
    <View className="flex-row items-center gap-3 py-2">
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Open ${displayName}`}
        className="min-w-0 flex-1 flex-row items-center gap-3"
      >
        <ScenePreviewThreeUp imageUris={previewImageUrls} align="start" />
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-1.5">
            {owner?.userImage ? (
              <Image
                source={{ uri: owner.userImage }}
                style={{ width: 20, height: 20, borderRadius: 10 }}
                contentFit="cover"
                cachePolicy="disk"
              />
            ) : (
              <View className="h-5 w-5 items-center justify-center rounded-full bg-neutral-4">
                <User size={12} color="#627496" />
              </View>
            )}
            <Text
              className="flex-1 text-base font-semibold text-neutral-1"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {displayName}
            </Text>
          </View>
          <Text
            className="text-sm text-neutral-2"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {upcomingLabel}
          </Text>
        </View>
      </TouchableOpacity>
      <SubscribeButton
        isSubscribed={true}
        onPress={onUnsubscribe}
        size="sm"
        loading={isUnsubscribing}
        accessibilityLabel={`Unsubscribe from ${displayName}`}
      />
    </View>
  );
}
