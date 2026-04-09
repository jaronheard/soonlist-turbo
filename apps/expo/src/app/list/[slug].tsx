import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { List as ListIcon } from "~/components/icons";
import UserEventsList from "~/components/UserEventsList";
import { logError } from "~/utils/errorLogging";
import { hapticSuccess, toast } from "~/utils/feedback";

export default function ListDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser);

  const result = useQuery(
    api.lists.getEventsForList,
    slug ? { slug } : "skip",
  );

  const listData = useQuery(
    api.lists.getBySlug,
    slug ? { slug } : "skip",
  );

  const followListMutation = useMutation(api.lists.followList);
  const unfollowListMutation = useMutation(api.lists.unfollowList);

  const followedLists = useQuery(
    api.lists.getFollowedLists,
    isAuthenticated ? {} : "skip",
  );

  const isFollowing = useMemo(
    () => followedLists?.some((l) => l.slug === slug) ?? false,
    [followedLists, slug],
  );

  const isOwnList = listData?.userId === currentUser?.id;

  const handleToggleFollow = useCallback(async () => {
    if (!listData) return;
    try {
      if (isFollowing) {
        await unfollowListMutation({ listId: listData.id });
      } else {
        await followListMutation({ listId: listData.id });
      }
      void hapticSuccess();
    } catch (error) {
      logError("Error toggling list follow", error);
      toast.error(isFollowing ? "Failed to unfollow list" : "Failed to follow list");
    }
  }, [listData, isFollowing, followListMutation, unfollowListMutation]);

  if (result === undefined || listData === undefined) {
    return (
      <>
        <Stack.Screen options={{ title: "List" }} />
        <View className="flex-1 items-center justify-center bg-interactive-3">
          <ActivityIndicator size="large" color="#5A32FB" />
        </View>
      </>
    );
  }

  if (result === null || listData === null) {
    return (
      <>
        <Stack.Screen options={{ title: "List" }} />
        <View className="flex-1 items-center justify-center bg-interactive-3">
          <Text className="text-base text-neutral-2">List not found</Text>
        </View>
      </>
    );
  }

  const events = result.events.map((event) => ({
    event,
    similarEvents: [],
    similarityGroupId: event.id,
    similarEventsCount: 0,
  }));

  return (
    <>
      <Stack.Screen
        options={{
          title: result.list.name,
          headerRight: () =>
            isAuthenticated && !isOwnList ? (
              <TouchableOpacity
                onPress={() => void handleToggleFollow()}
                activeOpacity={0.7}
              >
                <Text className="text-base font-semibold text-interactive-1">
                  {isFollowing ? "Unfollow" : "Follow"}
                </Text>
              </TouchableOpacity>
            ) : null,
        }}
      />
      <UserEventsList
        groupedEvents={events}
        showCreator="always"
        onEndReached={() => undefined}
        isFetchingNextPage={false}
        HeaderComponent={() => (
          <View className="items-center px-4 pb-2">
            <View className="mb-2 h-12 w-12 items-center justify-center rounded-2xl bg-interactive-2">
              <ListIcon size={24} color="#5A32FB" />
            </View>
            <Text className="text-lg font-bold text-neutral-1">
              {result.list.name}
            </Text>
            {listData?.owner && (
              <Text className="text-sm text-neutral-2">
                by {listData.owner.displayName || listData.owner.username}
              </Text>
            )}
          </View>
        )}
      />
    </>
  );
}
