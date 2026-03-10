import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useConvexAuth, useMutation, useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { Check, Globe2 } from "~/components/icons";
import SaveShareButton from "~/components/SaveShareButton";
import UserEventsList from "~/components/UserEventsList";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useStableTimestamp } from "~/store";
import { logError } from "~/utils/errorLogging";
import { hapticSuccess, toast } from "~/utils/feedback";

export default function ListDetailPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const stableTimestamp = useStableTimestamp();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const { user } = useUser();
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // Fetch list data by slug
  const list = useQuery(api.lists.getListBySlug, slug ? { slug } : "skip");

  // Check if current user is following this list
  const isFollowing = useQuery(
    api.lists.isFollowingList,
    list?.id ? { listId: list.id } : "skip",
  );

  // Follow/unfollow mutations
  const followListMutation = useMutation(api.lists.followList);
  const unfollowListMutation = useMutation(api.lists.unfollowList);

  // Query to get current user's saved event IDs
  const savedEventIdsQuery = useQuery(
    api.events.getSavedIdsForUser,
    isAuthenticated && user?.username ? { userName: user.username } : "skip",
  );

  const savedEventIds = new Set(
    savedEventIdsQuery?.map((event) => event.id) ?? [],
  );

  // Fetch list events
  const {
    results: events,
    status,
    loadMore,
  } = useStablePaginatedQuery(
    api.feeds.getListEvents,
    slug
      ? {
          slug,
          filter: "upcoming" as const,
        }
      : "skip",
    { initialNumItems: 50 },
  );

  // Client-side safety filter: hide events that have ended
  const filteredEvents = useMemo(() => {
    const currentTime = new Date(stableTimestamp).getTime();
    return events.filter((event) => {
      const eventEndTime = new Date(event.endDateTime).getTime();
      return eventEndTime >= currentTime;
    });
  }, [events, stableTimestamp]);

  const handleLoadMore = () => {
    if (status === "CanLoadMore") {
      loadMore(25);
    }
  };

  const handleFollow = useCallback(async () => {
    if (!list?.id) return;

    // If not authenticated, redirect to sign-in
    if (!isAuthenticated) {
      router.push("/(auth)/sign-in");
      return;
    }

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowListMutation({ listId: list.id });
      } else {
        await followListMutation({ listId: list.id });
      }
      void hapticSuccess();
    } catch (error) {
      logError("Error following/unfollowing list", error);
      toast.error(isFollowing ? "Failed to unfollow" : "Failed to follow");
    } finally {
      setIsFollowLoading(false);
    }
  }, [
    list,
    isAuthenticated,
    isFollowing,
    followListMutation,
    unfollowListMutation,
    router,
  ]);

  // list is undefined while loading, null if not found
  const isListLoading = list === undefined;
  const listNotFound = list === null;

  // Show loading state while list data is being fetched
  if (isListLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerTransparent: false,
            headerBackground: () => (
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#E0D9FF",
                }}
              />
            ),
            headerRight: () => null,
          }}
        />
        <View className="flex-1 items-center justify-center bg-interactive-3">
          <ActivityIndicator size="large" color="#5A32FB" />
        </View>
      </>
    );
  }

  // Show not found state if list doesn't exist
  if (listNotFound) {
    return (
      <>
        <Stack.Screen
          options={{
            headerTransparent: false,
            headerBackground: () => (
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#E0D9FF",
                }}
              />
            ),
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
    if (!isAuthenticated || !user) {
      return null;
    }
    const isOwnEvent = event.userId === user.id;
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
          headerTransparent: false,
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
          ActionButton={ListSaveShareButtonWrapper}
          savedEventIds={savedEventIds}
          HeaderComponent={() => <ListHeader list={list} />}
        />
        <FollowButton
          isFollowing={isFollowing ?? false}
          isLoading={isFollowLoading || isFollowing === undefined}
          onPress={handleFollow}
        />
      </View>
    </>
  );
}

interface ListHeaderProps {
  list: {
    name: string;
    description?: string | null;
    contributorCount: number;
    followerCount: number;
  };
}

function ListHeader({ list }: ListHeaderProps) {
  return (
    <View className="items-center px-4 pb-2">
      {/* Icon */}
      <View className="mb-2 h-20 w-20 items-center justify-center rounded-full bg-interactive-2">
        <Globe2 size={40} color="#5A32FB" />
      </View>

      {/* Name */}
      <Text className="mt-2 text-xl font-bold text-neutral-1">{list.name}</Text>

      {/* Description */}
      {list.description && (
        <Text className="mt-1 text-center text-sm text-neutral-2">
          {list.description}
        </Text>
      )}

      {/* Stats */}
      <Text className="mt-1 text-sm text-neutral-2">
        {list.contributorCount} contributor
        {list.contributorCount !== 1 ? "s" : ""} · {list.followerCount} follower
        {list.followerCount !== 1 ? "s" : ""}
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
        accessibilityLabel={isFollowing ? "Unfollow" : "Get Updates"}
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
            {isLoading
              ? "Loading..."
              : isFollowing
                ? "Following"
                : "Get Updates"}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";
