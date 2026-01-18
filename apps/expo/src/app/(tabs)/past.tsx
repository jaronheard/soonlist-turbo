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

import type { EventWithSimilarity } from "~/utils/similarEvents";
import AddEventButton from "~/components/AddEventButton";
import LoadingSpinner from "~/components/LoadingSpinner";
import UserEventsList from "~/components/UserEventsList";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";

function PastEventsContent() {
  const { user } = useUser();

  // Fetch user stats
  const stats = useQuery(
    api.events.getStats,
    user?.username ? { userName: user.username } : "skip",
  );

  // Memoize query args to prevent unnecessary re-renders
  const queryArgs = useMemo(() => {
    return {
      filter: "past" as const,
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
  // The server now handles similarity grouping
  const enrichedEvents: EventWithSimilarity[] = useMemo(() => {
    return groupedEvents.map((group) => ({
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
  }, [groupedEvents]);

  return (
    <View className="flex-1 bg-white">
      <UserEventsList
        groupedEvents={enrichedEvents}
        onEndReached={handleLoadMore}
        showCreator="savedFromOthers"
        isFetchingNextPage={status === "LoadingMore"}
        isLoadingFirstPage={status === "LoadingFirstPage"}
        showSourceStickers
        savedEventIds={savedEventIds}
        source="past"
      />
      <AddEventButton showChevron={false} stats={stats} />
    </View>
  );
}

export default function PastEvents() {
  return (
    <>
      <AuthLoading>
        <View className="flex-1 bg-white">
          <LoadingSpinner />
        </View>
      </AuthLoading>

      <Unauthenticated>
        <Redirect href="/sign-in" />
      </Unauthenticated>

      <Authenticated>
        <PastEventsContent />
      </Authenticated>
    </>
  );
}

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";
