import React, { useCallback, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { Redirect, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { toast } from "sonner-native";

import { api } from "@soonlist/backend/convex/_generated/api";

import { ChevronDown, ChevronUp, X } from "~/components/icons";
import LoadingSpinner from "~/components/LoadingSpinner";
import UserEventsList from "~/components/UserEventsList";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useAppStore, useStableTimestamp } from "~/store";

function FollowingHeader() {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();
  const followingUsers = useQuery(api.users.getFollowingUsers);
  const unfollowUserMutation = useMutation(api.users.unfollowUser);

  const userCount = followingUsers?.length ?? 0;

  const handleUnfollow = async (userId: string) => {
    try {
      await unfollowUserMutation({ followingId: userId });
      toast.success("Unfollowed user");
    } catch {
      toast.error("Failed to unfollow user");
    }
  };

  if (userCount === 0) {
    return null;
  }

  return (
    <View className="border-b border-neutral-4 bg-white px-4 py-3">
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        className="flex-row items-center justify-between"
        activeOpacity={0.7}
      >
        <Text className="text-base font-semibold text-neutral-1">
          Following {userCount} {userCount === 1 ? "user" : "users"}
        </Text>
        {isExpanded ? (
          <ChevronUp size={20} color="#5A32FB" />
        ) : (
          <ChevronDown size={20} color="#5A32FB" />
        )}
      </TouchableOpacity>

      {isExpanded && followingUsers && (
        <View className="mt-3 space-y-2">
          {followingUsers.map((user) => (
            <View
              key={user.id}
              className="flex-row items-center justify-between py-2"
            >
              <TouchableOpacity
                onPress={() => router.push(`/${user.username}`)}
                className="flex-1 flex-row items-center"
                activeOpacity={0.7}
              >
                {user.userImage ? (
                  <Image
                    source={{ uri: user.userImage }}
                    className="size-8 rounded-full"
                  />
                ) : (
                  <View className="size-8 items-center justify-center rounded-full bg-neutral-4">
                    <Text className="text-sm font-medium text-neutral-2">
                      {user.displayName?.charAt(0).toUpperCase() ?? "?"}
                    </Text>
                  </View>
                )}
                <View className="ml-3 flex-1">
                  <Text
                    className="text-base font-medium text-neutral-1"
                    numberOfLines={1}
                  >
                    {user.displayName ?? user.username}
                  </Text>
                  <Text className="text-sm text-neutral-2" numberOfLines={1}>
                    @{user.username}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleUnfollow(user.id)}
                className="ml-2 rounded-full bg-neutral-4 p-2"
                activeOpacity={0.7}
              >
                <X size={16} color="#666" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function EmptyFollowingState() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="mb-2 text-center text-xl font-bold text-neutral-1">
        You&apos;re not following anyone yet
      </Text>
      <Text className="mb-6 text-center text-base text-neutral-2">
        Follow users to see their events here. Discover interesting people in
        the Discover feed.
      </Text>
      <TouchableOpacity
        onPress={() => router.push("/discover")}
        className="rounded-full bg-interactive-1 px-6 py-3"
        activeOpacity={0.7}
      >
        <Text className="text-base font-semibold text-white">
          Explore Discover
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function FollowingFeedContent() {
  const { user } = useUser();
  const stableTimestamp = useStableTimestamp();

  // Check if user is following anyone
  const followingUsers = useQuery(api.users.getFollowingUsers);
  const hasFollowings = (followingUsers?.length ?? 0) > 0;

  // Fetch user stats
  const stats = useQuery(
    api.events.getStats,
    user?.username ? { userName: user.username } : "skip",
  );

  // Memoize query args
  const queryArgs = useMemo(() => {
    return {
      filter: "upcoming" as const,
    };
  }, []);

  const {
    results: events,
    status,
    loadMore,
  } = useStablePaginatedQuery(
    api.feeds.getFollowedUsersFeed,
    hasFollowings ? queryArgs : "skip",
    {
      initialNumItems: 50,
    },
  );

  // Memoize saved events query args
  const savedEventsQueryArgs = useMemo(() => {
    if (!user?.username) return "skip";
    return { userName: user.username };
  }, [user?.username]);

  const savedEventIdsQuery = useQuery(
    api.events.getSavedIdsForUser,
    savedEventsQueryArgs,
  );

  const handleLoadMore = useCallback(() => {
    if (status === "CanLoadMore") {
      loadMore(25);
    }
  }, [status, loadMore]);

  const savedEventIds = new Set(
    savedEventIdsQuery?.map((event) => event.id) ?? [],
  );

  // Filter out ended events client-side
  const enrichedEvents = useMemo(() => {
    const currentTime = new Date(stableTimestamp).getTime();
    return events
      .filter((event) => {
        const eventEndTime = new Date(event.endDateTime).getTime();
        return eventEndTime >= currentTime;
      })
      .map((event) => ({
        ...event,
        eventFollows: [],
        comments: [],
        eventToLists: [],
        lists: [],
      }));
  }, [events, stableTimestamp]);

  // Show empty state if not following anyone
  if (followingUsers !== undefined && !hasFollowings) {
    return <EmptyFollowingState />;
  }

  return (
    <View className="flex-1 bg-white">
      <UserEventsList
        events={enrichedEvents}
        onEndReached={handleLoadMore}
        isFetchingNextPage={status === "LoadingMore"}
        isLoadingFirstPage={
          status === "LoadingFirstPage" || followingUsers === undefined
        }
        showCreator="always"
        stats={stats}
        showSourceStickers
        savedEventIds={savedEventIds}
        source="following"
        HeaderComponent={FollowingHeader}
      />
    </View>
  );
}

function FollowingFeed() {
  const hasSeenOnboarding = useAppStore((state) => state.hasSeenOnboarding);

  return (
    <>
      <AuthLoading>
        <View className="flex-1 bg-white">
          <LoadingSpinner />
        </View>
      </AuthLoading>

      <Unauthenticated>
        {!hasSeenOnboarding ? (
          <Redirect href="/(onboarding)/onboarding" />
        ) : (
          <Redirect href="/sign-in" />
        )}
      </Unauthenticated>

      <Authenticated>
        <FollowingFeedContent />
      </Authenticated>
    </>
  );
}

export default FollowingFeed;

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";
