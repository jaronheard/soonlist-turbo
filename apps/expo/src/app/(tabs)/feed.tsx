import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import type { EventWithSimilarity } from "~/utils/similarEvents";
import LoadingSpinner from "~/components/LoadingSpinner";
import { TabHeader } from "~/components/TabHeader";
import UserEventsList from "~/components/UserEventsList";
import { useRatingPrompt } from "~/hooks/useRatingPrompt";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useAppStore, useStableTimestamp } from "~/store";

function MyFeedContent() {
  const { user } = useUser();
  const [selectedSegment, setSelectedSegment] = useState(0);
  const filter: "upcoming" | "past" =
    selectedSegment === 0 ? "upcoming" : "past";

  const stableTimestamp = useStableTimestamp();
  const setMyListBadgeCount = useAppStore((s) => s.setMyListBadgeCount);

  // Fetch user stats
  const stats = useQuery(
    api.events.getStats,
    user?.username ? { userName: user.username } : "skip",
  );

  const queryArgs = useMemo(() => {
    return {
      filter,
    };
  }, [filter]);

  const {
    results: groupedEvents,
    status,
    loadMore,
  } = useStablePaginatedQuery(api.feeds.getMyFeedGrouped, queryArgs, {
    initialNumItems: 50,
  });

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

  const enrichedEvents: EventWithSimilarity[] = useMemo(() => {
    if (filter === "upcoming") {
      const currentTime = new Date(stableTimestamp).getTime();
      return groupedEvents
        .filter((group) => {
          const eventEndTime = new Date(group.event.endDateTime).getTime();
          return eventEndTime >= currentTime;
        })
        .map((group) => ({
          event: {
            ...group.event,
            eventFollows: [],
            comments: [],
            eventToLists: [],
            lists: [],
          },
          similarEvents: Array(group.similarEventsCount).fill({
            event: null,
            similarityDetails: null,
          }),
        }));
    }
    // Past events - no client-side time filtering
    return groupedEvents.map((group) => ({
      event: {
        ...group.event,
        eventFollows: [],
        comments: [],
        eventToLists: [],
        lists: [],
      },
      similarEvents: Array(group.similarEventsCount).fill({
        event: null,
        similarityDetails: null,
      }),
    }));
  }, [groupedEvents, stableTimestamp, filter]);

  // Update badge count based on upcoming events
  useEffect(() => {
    if (filter === "upcoming") {
      setMyListBadgeCount(enrichedEvents.length);
    }
  }, [enrichedEvents.length, filter, setMyListBadgeCount]);

  // Trigger rating prompt when user has 3+ upcoming events
  useRatingPrompt(filter === "upcoming" ? enrichedEvents.length : 0);

  const HeaderComponent = useCallback(
    () => (
      <TabHeader
        variant="mylist"
        selectedSegmentIndex={selectedSegment}
        onSegmentChange={setSelectedSegment}
      />
    ),
    [selectedSegment],
  );

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <UserEventsList
        groupedEvents={enrichedEvents}
        onEndReached={handleLoadMore}
        isFetchingNextPage={status === "LoadingMore"}
        isLoadingFirstPage={status === "LoadingFirstPage"}
        showCreator="savedFromOthers"
        stats={stats}
        showSourceStickers
        savedEventIds={savedEventIds}
        source="feed"
        HeaderComponent={HeaderComponent}
      />
    </View>
  );
}

function MyFeed() {
  const { hasSeenOnboarding } = useAppStore();

  return (
    <>
      <AuthLoading>
        <View style={{ flex: 1, backgroundColor: "#F4F1FF" }}>
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
        <MyFeedContent />
      </Authenticated>
    </>
  );
}

export default MyFeed;

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";
