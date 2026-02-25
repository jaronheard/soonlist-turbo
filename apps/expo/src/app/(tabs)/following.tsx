import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import type { Segment } from "~/components/SegmentedControl";
import LoadingSpinner from "~/components/LoadingSpinner";
import { TabHeader } from "~/components/TabHeader";
import UserEventsList from "~/components/UserEventsList";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useAppStore, useStableTimestamp } from "~/store";
import Config from "~/utils/config";

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
  const [selectedSegment, setSelectedSegment] = useState<Segment>("upcoming");
  const stableTimestamp = useStableTimestamp();

  const followingUsers = useQuery(api.users.getFollowingUsers);
  const hasFollowings = (followingUsers?.length ?? 0) > 0;

  const handleSegmentChange = useCallback((segment: Segment) => {
    setSelectedSegment(segment);
  }, []);

  const queryArgs = useMemo(
    () => ({ filter: selectedSegment }),
    [selectedSegment],
  );

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

  const enrichedEvents = useMemo(() => {
    const currentTime = new Date(stableTimestamp).getTime();
    return events
      .filter((event) => {
        const eventEndTime = new Date(event.endDateTime).getTime();
        return selectedSegment === "upcoming"
          ? eventEndTime >= currentTime
          : eventEndTime < currentTime;
      })
      .map((event) => ({
        ...event,
        eventFollows: [],
        comments: [],
        eventToLists: [],
        lists: [],
      }));
  }, [events, stableTimestamp, selectedSegment]);

  // Update tab badge count based on upcoming events
  const setCommunityBadgeCount = useAppStore((s) => s.setCommunityBadgeCount);
  useEffect(() => {
    if (selectedSegment === "upcoming") {
      setCommunityBadgeCount(enrichedEvents.length);
    }
  }, [enrichedEvents.length, selectedSegment, setCommunityBadgeCount]);

  const displayName = user?.firstName ?? user?.username ?? "My";
  const username = user?.username ?? "";
  const title = `${displayName}'s Board`;
  const shareUrl = `${Config.apiBaseUrl}/${username}/scene`;
  const displayUrl = `soonlist.com/${username}/board`;

  const HeaderComponent = useCallback(
    () => (
      <TabHeader
        title={title}
        shareUrl={shareUrl}
        displayUrl={displayUrl}
        selectedSegment={selectedSegment}
        onSegmentChange={handleSegmentChange}
      />
    ),
    [title, shareUrl, displayUrl, selectedSegment, handleSegmentChange],
  );

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
        showSourceStickers
        savedEventIds={savedEventIds}
        source="following"
        HeaderComponent={HeaderComponent}
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
