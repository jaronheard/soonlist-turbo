import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import { api } from "@soonlist/backend/convex/_generated/api";

import { FeaturedListRow } from "~/components/FeaturedListRow";
import { UsernameEntryModal } from "~/components/UsernameEntryModal";

interface DefaultEmptyStateProps {
  hasFollowings: boolean;
  followedEventCount: number;
  hasMoreFollowedEvents: boolean;
  followedLists: Doc<"lists">[] | undefined;
  onExitToFeed: () => void;
}

export function DefaultEmptyState({
  hasFollowings,
  followedEventCount,
  hasMoreFollowedEvents,
  followedLists,
  onExitToFeed,
}: DefaultEmptyStateProps) {
  const { user } = useUser();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const userData = useQuery(
    api.users.getByUsername,
    user?.username ? { userName: user.username } : "skip",
  );
  const currentUserId = userData?.id;

  const featuredLists = useQuery(api.appConfig.getFeaturedLists, {}) ?? [];

  return (
    <>
      <UsernameEntryModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSubscribeSuccess={onExitToFeed}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: "#F4F1FF" }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 80,
        }}
      >
        <View className="px-3 pb-2" style={{ marginTop: -4 }}>
          <Text
            className="mb-1 text-base font-medium text-neutral-2"
            style={{ paddingLeft: 6 }}
          >
            Events from lists I subscribe to
          </Text>
        </View>

        <View className="px-6 pt-6">
          {/* Shared-first primary block */}
          <View className="mb-6 rounded-2xl border border-neutral-3 bg-white p-4">
            <Text className="mb-3 text-base font-semibold text-neutral-1">
              Someone shared a list with you?
            </Text>
            <TouchableOpacity
              onPress={() => setIsModalVisible(true)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Enter their username"
              className="w-full rounded-full bg-interactive-1 py-3"
            >
              <Text className="text-center text-base font-semibold text-white">
                Enter their username
              </Text>
            </TouchableOpacity>
          </View>

          {/* Divider — only show when we have featured lists to offer */}
          {featuredLists.length > 0 ? (
            <View className="mb-4 flex-row items-center gap-3">
              <View className="h-px flex-1 bg-neutral-3" />
              <Text className="text-sm text-neutral-2">
                Or start with one of these
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

          {hasFollowings ? (
            <View className="mt-4 items-center">
              <Text className="mb-1 text-sm text-neutral-2">
                {followedEventCount === 1
                  ? "1 event added to My Scene"
                  : `${followedEventCount}${
                      hasMoreFollowedEvents ? "+" : ""
                    } events added to My Scene`}
              </Text>
              <TouchableOpacity
                onPress={onExitToFeed}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="View My Scene"
                className="px-2 py-2"
              >
                <Text className="text-base font-semibold text-interactive-1">
                  View My Scene →
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}
