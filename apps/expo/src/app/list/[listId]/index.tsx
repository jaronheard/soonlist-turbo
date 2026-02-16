import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams } from "expo-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { Check, Globe2 } from "~/components/icons";
import { LiquidGlassHeader } from "~/components/LiquidGlassHeader";
import SaveShareButton from "~/components/SaveShareButton";
import UserEventsList from "~/components/UserEventsList";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useStableTimestamp } from "~/store";
import { logError } from "~/utils/errorLogging";
import { hapticSuccess, toast } from "~/utils/feedback";

export default function ListDetailPage() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const stableTimestamp = useStableTimestamp();
  const { isAuthenticated } = useConvexAuth();
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const list = useQuery(api.lists.getList, listId ? { listId } : "skip");
  const isFollowing = useQuery(
    api.lists.isFollowingList,
    listId ? { listId } : "skip",
  );
  const currentUser = useQuery(api.users.getCurrentUser);

  const followListMutation = useMutation(api.lists.followList);
  const unfollowListMutation = useMutation(api.lists.unfollowList);

  const savedEventIdsQuery = useQuery(
    api.events.getSavedIdsForUser,
    isAuthenticated && currentUser?.username
      ? { userName: currentUser.username }
      : "skip",
  );

  const savedEventIds = new Set(
    savedEventIdsQuery?.map((event) => event.id) ?? [],
  );

  const {
    results: events,
    status,
    loadMore,
  } = useStablePaginatedQuery(
    api.feeds.getListFeed,
    listId ? { listId, filter: "upcoming" as const } : "skip",
    { initialNumItems: 50 },
  );

  const filteredEvents = useMemo(() => {
    const currentTime = new Date(stableTimestamp).getTime();
    return events.filter((event) => {
      const eventEndTime = new Date(event.endDateTime).getTime();
      return eventEndTime >= currentTime;
    });
  }, [events, stableTimestamp]);

  const handleLoadMore = useCallback(() => {
    if (status === "CanLoadMore") {
      loadMore(25);
    }
  }, [status, loadMore]);

  const handleFollow = useCallback(async () => {
    if (!listId) return;

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowListMutation({ listId });
      } else {
        await followListMutation({ listId });
      }
      void hapticSuccess();
    } catch (error) {
      logError("Error following/unfollowing list", error);
      toast.error(isFollowing ? "Failed to unfollow" : "Failed to follow");
    } finally {
      setIsFollowLoading(false);
    }
  }, [listId, isFollowing, followListMutation, unfollowListMutation]);

  const isListLoading = list === undefined;
  const listNotFound = list === null;

  if (isListLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerTransparent: true,
            headerBackground: () => <LiquidGlassHeader />,
            headerRight: () => null,
          }}
        />
        <View className="flex-1 items-center justify-center bg-interactive-3">
          <ActivityIndicator size="large" color="#5A32FB" />
        </View>
      </>
    );
  }

  if (listNotFound) {
    return (
      <>
        <Stack.Screen
          options={{
            headerTransparent: true,
            headerBackground: () => <LiquidGlassHeader />,
            headerRight: () => null,
          }}
        />
        <View className="flex-1 items-center justify-center bg-white">
          <Text className="text-lg text-neutral-2">List not found</Text>
        </View>
      </>
    );
  }

  function ListSaveShareButtonWrapper({
    event,
  }: {
    event: { id: string; userId: string };
  }) {
    if (!isAuthenticated || !currentUser) {
      return null;
    }
    const isOwnEvent = event.userId === currentUser.id;
    const isSaved = savedEventIds.has(event.id);
    return (
      <SaveShareButton
        eventId={event.id}
        isSaved={isSaved}
        isOwnEvent={isOwnEvent}
        source="list_detail"
      />
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: list.name,
          headerTransparent: true,
          headerBackground: () => (
            <View
              style={{
                flex: 1,
                backgroundColor: "#E0D9FF",
              }}
            />
          ),
          headerTintColor: "#5A32FB",
          headerTitleStyle: {
            color: "#5A32FB",
          },
          headerRight: () => null,
        }}
      />
      <View className="flex-1 bg-interactive-3">
        <UserEventsList
          events={filteredEvents}
          onEndReached={handleLoadMore}
          isFetchingNextPage={status === "LoadingMore"}
          isLoadingFirstPage={status === "LoadingFirstPage"}
          showCreator="always"
          hideDiscoverableButton={true}
          isDiscoverFeed={false}
          ActionButton={ListSaveShareButtonWrapper}
          savedEventIds={savedEventIds}
          HeaderComponent={() => (
            <ListHeader list={list} eventCount={filteredEvents.length} />
          )}
        />
        {isAuthenticated && (
          <FollowButton
            isFollowing={isFollowing ?? false}
            isLoading={isFollowLoading || isFollowing === undefined}
            onPress={handleFollow}
          />
        )}
      </View>
    </>
  );
}

interface ListHeaderProps {
  list: {
    name: string;
    description: string;
  };
  eventCount: number;
}

function ListHeader({ list, eventCount }: ListHeaderProps) {
  return (
    <View className="items-center px-4 pb-2">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-interactive-2">
        <Globe2 size={40} color="#5A32FB" />
      </View>

      <Text className="mt-2 text-xl font-bold text-neutral-1">{list.name}</Text>

      {list.description ? (
        <Text className="mt-1 text-center text-sm text-neutral-2">
          {list.description}
        </Text>
      ) : null}

      <Text className="mt-1 text-sm text-neutral-2">
        {eventCount} upcoming {eventCount === 1 ? "event" : "events"}
      </Text>
    </View>
  );
}

function FollowButton({
  isFollowing,
  isLoading,
  onPress,
}: {
  isFollowing: boolean;
  isLoading: boolean;
  onPress: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="absolute bottom-0 flex-row items-center justify-center self-center"
      style={{
        paddingBottom: insets.bottom + 16,
        shadowColor: "#5A32FB",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        disabled={isLoading}
        accessibilityLabel={isFollowing ? "Unfollow" : "Follow"}
        accessibilityRole="button"
        activeOpacity={0.8}
      >
        <View
          className={`flex-row items-center rounded-full px-8 py-5 ${
            isFollowing
              ? "gap-3 bg-neutral-2"
              : isLoading
                ? "gap-3 bg-interactive-1"
                : "bg-interactive-1"
          }`}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : isFollowing ? (
            <Check size={24} color="#FFFFFF" strokeWidth={3} />
          ) : null}
          <Text className="text-xl font-bold text-white">
            {isLoading ? "Loading..." : isFollowing ? "Following" : "Follow"}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

export { ErrorBoundary } from "expo-router";
