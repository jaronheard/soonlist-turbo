import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
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

import { api } from "@soonlist/backend/convex/_generated/api";

import FollowingFeedbackBanner from "~/components/FollowingFeedbackBanner";
import { X } from "~/components/icons";
import LoadingSpinner from "~/components/LoadingSpinner";
import { TabHeader } from "~/components/TabHeader";
import UserEventsList from "~/components/UserEventsList";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useAppStore, useStableTimestamp } from "~/store";
import { hapticSuccess, toast } from "~/utils/feedback";

function FollowingHeader() {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();
  const followingUsers = useQuery(api.users.getFollowingUsers);
  const unfollowUserMutation = useMutation(api.users.unfollowUser);
  const userCount = followingUsers?.length ?? 0;

  const handleUnfollow = async (userId: string) => {
    try {
      await unfollowUserMutation({ followingId: userId });
      void hapticSuccess();
    } catch {
      toast.error("Failed to unfollow user");
    }
  };

  if (userCount === 0) return null;

  return (
    <View className="px-4 pb-3">
      <FollowingFeedbackBanner />
      <TouchableOpacity
        onPress={() => setIsExpanded((prev) => !prev)}
        className="items-center py-3"
        activeOpacity={0.7}
      >
        <Text className="text-sm text-neutral-2">
          Following{" "}
          <Text className="text-interactive-1">{userCount} lists</Text>
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <View className="space-y-2">
          {followingUsers?.map((followedUser) => (
            <View
              key={followedUser.id}
              className="flex-row items-center justify-between py-2"
            >
              <TouchableOpacity
                onPress={() => router.push(`/${followedUser.username}`)}
                className="flex-1 flex-row items-center"
                activeOpacity={0.7}
              >
                {followedUser.userImage ? (
                  <Image
                    source={{ uri: followedUser.userImage }}
                    className="size-8 rounded-full"
                  />
                ) : (
                  <View className="size-8 items-center justify-center rounded-full bg-neutral-4">
                    <Text className="text-sm font-medium text-neutral-2">
                      {followedUser.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View className="ml-3 flex-1">
                  <Text
                    className="text-base font-medium text-neutral-1"
                    numberOfLines={1}
                  >
                    {followedUser.publicListName}
                  </Text>
                  <Text className="text-sm text-neutral-2" numberOfLines={1}>
                    {followedUser.displayName}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleUnfollow(followedUser.id)}
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

function FollowingEmptyState() {
  return (
    <ScrollView
      style={{ backgroundColor: "#F4F1FF" }}
      contentContainerStyle={{
        paddingTop: 120,
        paddingBottom: 120,
        flexGrow: 1,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="items-center px-6 py-8">
        <Text className="text-center text-lg text-neutral-2">
          No events from people you follow
        </Text>
      </View>
    </ScrollView>
  );
}

function FollowingFeedContent() {
  const { user } = useUser();
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");
  const stableTimestamp = useStableTimestamp();
  const followingUsers = useQuery(api.users.getFollowingUsers);
  const hasFollowings = (followingUsers?.length ?? 0) > 0;

  const {
    results: events,
    status,
    loadMore,
  } = useStablePaginatedQuery(
    api.feeds.getFollowedUsersFeed,
    hasFollowings ? { filter } : "skip",
    { initialNumItems: 50 },
  );

  const savedEventIdsQuery = useQuery(
    api.events.getSavedIdsForUser,
    user?.username ? { userName: user.username } : "skip",
  );

  const handleLoadMore = useCallback(() => {
    if (status === "CanLoadMore") {
      loadMore(25);
    }
  }, [loadMore, status]);

  const savedEventIds = useMemo(
    () => new Set(savedEventIdsQuery?.map((event) => event.id) ?? []),
    [savedEventIdsQuery],
  );

  const enrichedEvents = useMemo(() => {
    const currentTime = new Date(stableTimestamp).getTime();
    return events
      .filter((event) => {
        if (filter === "past") return true;
        return new Date(event.endDateTime).getTime() >= currentTime;
      })
      .map((event) => ({
        ...event,
        eventFollows: [],
        comments: [],
        eventToLists: [],
        lists: [],
      }));
  }, [events, filter, stableTimestamp]);

  if (followingUsers !== undefined && !hasFollowings) {
    return <Redirect href="/feed" />;
  }

  const displayName = user?.fullName ?? user?.firstName ?? "Your";
  const username = user?.username ?? "soonlist";

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
        showSourceStickers={false}
        hideDiscoverableButton
        savedEventIds={savedEventIds}
        source="following"
        HeaderComponent={() => (
          <View>
            <TabHeader
              type="board"
              displayName={displayName}
              username={username}
              filter={filter}
              onFilterChange={setFilter}
            />
            <FollowingHeader />
          </View>
        )}
        EmptyStateComponent={FollowingEmptyState}
      />
    </View>
  );
}

function FollowingFeed() {
  const hasSeenOnboarding = useAppStore((state) => state.hasSeenOnboarding);

  return (
    <>
      <AuthLoading>
        <View className="flex-1 bg-interactive-3">
          <View className="h-[100px]" />
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
export { ErrorBoundary } from "expo-router";
