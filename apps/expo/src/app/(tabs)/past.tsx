import React, { useCallback, useMemo } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import AddEventButton from "~/components/AddEventButton";
import LoadingSpinner from "~/components/LoadingSpinner";
import UserEventsList from "~/components/UserEventsList";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useStableTimestamp } from "~/store";

function PastEventsContent() {
  const { user } = useUser();
  const { customerInfo } = useRevenueCat();
  const hasUnlimited =
    customerInfo?.entitlements.active.unlimited?.isActive ?? false;

  // Use the stable timestamp from the store that updates every 15 minutes
  // This prevents InvalidCursor errors while still filtering for past events
  const stableTimestamp = useStableTimestamp();

  // Memoize query args to prevent unnecessary re-renders
  const queryArgs = useMemo(() => {
    return {
      filter: "past" as const,
      beforeThisDateTime: stableTimestamp,
    };
  }, [stableTimestamp]);

  const {
    results: events,
    status,
    loadMore,
    isLoading,
  } = useStablePaginatedQuery(api.feeds.getMyFeed, queryArgs, {
    initialNumItems: 20,
  });

  const handleLoadMore = useCallback(() => {
    if (status === "CanLoadMore") {
      loadMore(20);
    }
  }, [status, loadMore]);

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
          />
          <AddEventButton showChevron={false} />
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
