import React, { useCallback, useMemo } from "react";
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

import AddEventButton from "~/components/AddEventButton";
import LoadingSpinner from "~/components/LoadingSpinner";
import UserEventsList from "~/components/UserEventsList";
import { useRatingPrompt } from "~/hooks/useRatingPrompt";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useAppStore, useStableTimestamp } from "~/store";

function MyFeedContent() {
  const { user } = useUser();

  // Use the stable timestamp from the store that updates every 15 minutes
  // This prevents InvalidCursor errors while still filtering for upcoming events
  const stableTimestamp = useStableTimestamp();

  // Fetch user stats
  const stats = useQuery(
    api.events.getStats,
    user?.username ? { userName: user.username } : "skip",
  );

  // Memoize query args to prevent unnecessary re-renders
  const queryArgs = useMemo(() => {
    return {
      filter: "upcoming" as const,
    };
  }, []);

  const {
    results: groupedEvents,
    status,
    loadMore,
  } = useStablePaginatedQuery(api.feeds.getMyFeedGrouped, queryArgs, {
    initialNumItems: 50,
  });

  // Memoize saved events query args to prevent unnecessary re-renders
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

  // Transform grouped events into the format UserEventsList expects
  // The server now handles similarity grouping, so we just enrich the events
  const enrichedEvents = useMemo(() => {
    // Use stableTimestamp instead of recalculating Date.now()
    const currentTime = new Date(stableTimestamp).getTime();
    return groupedEvents
      .filter((group) => {
        // Client-side safety filter: hide events that have ended
        // This prevents showing ended events if the cron job hasn't run recently
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
        // Server-computed count (already shows just similar events, not including primary)
        similarEvents: Array(group.similarEventsCount).fill({
          event: null,
          similarityDetails: null,
        }),
      }));
  }, [groupedEvents, stableTimestamp]);

  // Trigger rating prompt when user has 3+ upcoming events
  useRatingPrompt(enrichedEvents.length);

  return (
    <View className="flex-1 bg-white">
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
      />
      <AddEventButton stats={stats} showChevron={false} />
    </View>
  );
}

function MyFeed() {
  const { hasSeenOnboarding } = useAppStore();

  return (
    <>
      <AuthLoading>
        <View className="flex-1 bg-white">
          <LoadingSpinner />
        </View>
      </AuthLoading>

      <Unauthenticated>
        {/* For guest users, check if they've seen onboarding */}
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
