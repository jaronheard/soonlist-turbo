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
import { useAppStore, useStableTimestamp } from "~/store";

function MyFeedContent() {
  const { user } = useUser();
  const { customerInfo } = useRevenueCat();
  const hasUnlimited =
    customerInfo?.entitlements.active.unlimited?.isActive ?? false;

  // Use the stable timestamp from the store that updates every 15 minutes
  // This prevents InvalidCursor errors while still filtering for upcoming events
  const stableTimestamp = useStableTimestamp();

  // Memoize query args to prevent unnecessary re-renders
  const queryArgs = useMemo(() => {
    if (!user?.username) return "skip";
    return {
      userName: user.username,
      filter: "upcoming" as const,
      beforeThisDateTime: stableTimestamp,
    };
  }, [user?.username, stableTimestamp]);

  const {
    results: events,
    status,
    loadMore,
  } = useStablePaginatedQuery(api.events.getEventsForUserPaginated, queryArgs, {
    initialNumItems: 20,
  });

  const handleLoadMore = useCallback(() => {
    if (status === "CanLoadMore") {
      loadMore(20);
    }
  }, [status, loadMore]);

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1">
        <UserEventsList
          events={events}
          onEndReached={handleLoadMore}
          isFetchingNextPage={status === "LoadingMore"}
          isLoadingFirstPage={status === "LoadingFirstPage"}
          showCreator="savedFromOthers"
          stats={undefined}
          promoCard={{ type: "addEvents" }}
          hasUnlimited={hasUnlimited}
        />
        <AddEventButton stats={undefined} />
      </View>
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
