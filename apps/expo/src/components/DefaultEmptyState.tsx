import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";

import { DiscoverSoonlistsContent } from "~/components/DiscoverSoonlistsContent";

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
  return (
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
          Events from Soonlists I subscribe to
        </Text>
      </View>

      <View className="px-6 pt-6">
        <DiscoverSoonlistsContent
          followedLists={followedLists}
          onSubscribeSuccess={onExitToFeed}
        />

        {hasFollowings ? (
          <View className="mt-4 items-center">
            {followedEventCount > 0 ? (
              <Text className="mb-1 text-sm text-neutral-2">
                {followedEventCount === 1
                  ? "1 event added to My Scene"
                  : `${followedEventCount}${
                      hasMoreFollowedEvents ? "+" : ""
                    } events added to My Scene`}
              </Text>
            ) : null}
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
  );
}
