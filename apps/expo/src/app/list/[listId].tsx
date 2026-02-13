import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import SaveShareButton from "~/components/SaveShareButton";
import UserEventsList from "~/components/UserEventsList";
import { useStableTimestamp } from "~/store";

export default function ListDetailScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const stableTimestamp = useStableTimestamp();
  const list = useQuery(api.lists.getListById, listId ? { listId } : "skip");
  const events = useQuery(
    api.lists.getListEvents,
    listId ? { listId } : "skip",
  );
  const isFollowing = useQuery(
    api.lists.isFollowingList,
    listId ? { listId } : "skip",
  );
  const followList = useMutation(api.lists.followList);
  const unfollowList = useMutation(api.lists.unfollowList);

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    const now = new Date(stableTimestamp).getTime();
    return events.filter(
      (event) => new Date(event.endDateTime).getTime() >= now,
    );
  }, [events, stableTimestamp]);

  if (!listId) {
    return null;
  }

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 py-3">
        <Text className="font-heading text-2xl font-bold text-black">
          {list?.name ?? "PDX Discover"}
        </Text>
        {!!list?.description && (
          <Text className="text-neutral-2">{list.description}</Text>
        )}
        <Text
          onPress={() =>
            isFollowing
              ? void unfollowList({ listId })
              : void followList({ listId })
          }
          className="mt-2 text-base font-semibold text-interactive-1"
        >
          {isFollowing ? "Unfollow" : "Follow"}
        </Text>
      </View>

      <UserEventsList
        events={filteredEvents}
        onEndReached={() => undefined}
        isFetchingNextPage={false}
        ActionButton={({ event }) => (
          <SaveShareButton
            eventId={event.id}
            isSaved={false}
            isOwnEvent={false}
            source="list"
          />
        )}
        hideDiscoverableButton
        showCreator="always"
        isDiscoverFeed={false}
      />
    </View>
  );
}
