import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  usePaginatedQuery,
  useQuery,
} from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import type { Segment } from "~/components/TabHeader";
import LoadingSpinner from "~/components/LoadingSpinner";
import { TabHeader } from "~/components/TabHeader";
import UserEventsList from "~/components/UserEventsList";
import { useAppStore, useStableTimestamp } from "~/store";
import Config from "~/utils/config";

function EmptyFollowingState() {
  const router = useRouter();

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "white",
        paddingHorizontal: 24,
      }}
    >
      <Text
        style={{
          marginBottom: 8,
          textAlign: "center",
          fontSize: 20,
          fontWeight: "bold",
          color: "#333",
        }}
      >
        You&apos;re not following anyone yet
      </Text>
      <Text
        style={{
          marginBottom: 24,
          textAlign: "center",
          fontSize: 16,
          color: "#666",
        }}
      >
        Follow users to see their events here. Discover interesting people in
        the Discover feed.
      </Text>
      <TouchableOpacity
        onPress={() => router.push("/discover")}
        style={{
          borderRadius: 9999,
          backgroundColor: "#5A32FB",
          paddingHorizontal: 24,
          paddingVertical: 12,
        }}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 16, fontWeight: "600", color: "white" }}>
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

  // Check if user is following anyone
  const followingUsers = useQuery(api.users.getFollowingUsers);
  const hasFollowings = (followingUsers?.length ?? 0) > 0;

  const handleSegmentChange = useCallback((segment: Segment) => {
    setSelectedSegment(segment);
  }, []);

  // Query args
  const queryArgs = useMemo(() => {
    return {
      filter: selectedSegment,
    };
  }, [selectedSegment]);

  const {
    results: events,
    status,
    loadMore,
  } = usePaginatedQuery(
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

  // Filter events client-side for upcoming safety check
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

  // Dynamic user data
  const displayName = user?.firstName ?? user?.fullName ?? "My";
  const username = user?.username ?? "";
  const shareUrl = `${Config.apiBaseUrl}/${username}/board`;

  const HeaderComponent = useCallback(() => {
    return (
      <TabHeader
        title={`${displayName}'s Board`}
        subtitle={`soonlist.com/${username}/board`}
        shareUrl={shareUrl}
        selectedSegment={selectedSegment}
        onSegmentChange={handleSegmentChange}
        upcomingCount={
          selectedSegment === "upcoming" ? enrichedEvents.length : undefined
        }
      />
    );
  }, [
    displayName,
    username,
    shareUrl,
    selectedSegment,
    handleSegmentChange,
    enrichedEvents.length,
  ]);

  // Show empty state if not following anyone
  if (followingUsers !== undefined && !hasFollowings) {
    return <EmptyFollowingState />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
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
        <View style={{ flex: 1, backgroundColor: "white" }}>
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
