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
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useRevenueCat } from "~/providers/RevenueCatProvider";

function PastEventsContent() {
  const { user } = useUser();
  const { customerInfo } = useRevenueCat();
  const hasUnlimited =
    customerInfo?.entitlements.active.unlimited?.isActive ?? false;

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
    results: events,
    status,
    loadMore,
    isLoading,
  } = useStablePaginatedQuery(api.feeds.getMyFeed, queryArgs, {
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

  // Add missing properties that UserEventsList expects
  const enrichedEvents = useMemo(() => {
    return events.map((event) => ({
      ...event,
      eventFollows: [],
      comments: [],
      eventToLists: [],
      lists: [],
    }));
  }, [events]);

  return (
    <View className="flex-1 bg-white">
      {isLoading && status === "LoadingFirstPage" ? (
        <LoadingSpinner />
      ) : (
        <View className="flex-1">
          <UserEventsList
            events={enrichedEvents}
            onEndReached={handleLoadMore}
            showCreator="savedFromOthers"
            isFetchingNextPage={status === "LoadingMore"}
            hasUnlimited={hasUnlimited}
            savedEventIds={savedEventIds}
          />
          <AddEventButton showChevron={false} stats={stats} />
        </View>
      )}
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
