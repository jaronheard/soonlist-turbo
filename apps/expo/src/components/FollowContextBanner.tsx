import React from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { usePendingFollowUsername } from "~/store";

export function FollowContextBanner() {
  const pendingFollowUsername = usePendingFollowUsername();

  const userData = useQuery(
    api.users.getByUsername,
    pendingFollowUsername ? { userName: pendingFollowUsername } : "skip",
  );

  if (!pendingFollowUsername) {
    return null;
  }

  const displayName = userData?.displayName ?? `@${pendingFollowUsername}`;
  const avatarUrl = userData?.userImage;

  return (
    <View className="flex-row items-center rounded-2xl bg-interactive-2 px-4 py-3">
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: 32, height: 32, borderRadius: 16 }}
          contentFit="cover"
          cachePolicy="disk"
        />
      ) : (
        <View className="h-8 w-8 items-center justify-center rounded-full bg-neutral-1/20">
          <Text className="text-sm font-bold text-neutral-1">
            {pendingFollowUsername.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <Text className="ml-3 flex-1 text-base font-semibold text-neutral-1">
        You're here to follow {displayName}'s list
      </Text>
    </View>
  );
}
