import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import { api } from "@soonlist/backend/convex/_generated/api";

import { FeaturedListRow } from "~/components/FeaturedListRow";
import { UsernameEntryModal } from "~/components/UsernameEntryModal";

interface DiscoverSoonlistsContentProps {
  followedLists: Doc<"lists">[] | undefined;
  onSubscribeSuccess?: () => void;
}

export function DiscoverSoonlistsContent({
  followedLists,
  onSubscribeSuccess,
}: DiscoverSoonlistsContentProps) {
  const { user } = useUser();
  const [isUsernameModalVisible, setIsUsernameModalVisible] = useState(false);

  const userData = useQuery(
    api.users.getByUsername,
    user?.username ? { userName: user.username } : "skip",
  );
  const currentUserId = userData?.id;

  const featuredLists = useQuery(api.appConfig.getFeaturedLists, {}) ?? [];

  return (
    <>
      <UsernameEntryModal
        isVisible={isUsernameModalVisible}
        onClose={() => setIsUsernameModalVisible(false)}
        onSubscribeSuccess={onSubscribeSuccess}
      />
      <View
        className="mb-6 rounded-2xl border border-neutral-3/70 p-3"
        style={{ backgroundColor: "rgba(255,255,255,0.72)" }}
      >
        <Text className="mb-2 text-sm font-medium text-neutral-2">
          Someone shared their Soonlist with you?
        </Text>
        <TouchableOpacity
          onPress={() => setIsUsernameModalVisible(true)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Find by username"
          className="w-full self-center rounded-full bg-interactive-1 px-6 py-2"
          style={{ maxWidth: 320 }}
        >
          <Text className="text-center text-sm font-semibold text-white">
            Find by username
          </Text>
        </TouchableOpacity>
      </View>

      {featuredLists.length > 0 ? (
        <View className="mb-4 flex-row items-center gap-3">
          <View className="h-px flex-1 bg-neutral-3" />
          <Text className="text-center text-sm text-neutral-2">
            Or start with these from Portland
          </Text>
          <View className="h-px flex-1 bg-neutral-3" />
        </View>
      ) : null}

      {featuredLists.length > 0 ? (
        <View className="mb-2">
          {featuredLists.map((list) => (
            <FeaturedListRow
              key={list.username}
              username={list.username}
              displayName={list.displayName}
              currentUserId={currentUserId}
              followedLists={followedLists}
            />
          ))}
        </View>
      ) : null}
    </>
  );
}
