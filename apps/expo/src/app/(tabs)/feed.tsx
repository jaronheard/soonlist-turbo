import React, { useCallback, useMemo } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

import AddEventButton from "~/components/AddEventButton";
import LoadingSpinner from "~/components/LoadingSpinner";
import UserEventsList from "~/components/UserEventsList";
import { useCachedFeed } from "~/hooks/useCachedFeed";
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

  const {
    items: events,
    status,
    loadMore,
    isLoadingFirstPage,
    isLoadingMore,
    isOffline: _isOffline, // Will be used for offline indicators
    lastUpdated: _lastUpdated, // Will be used for freshness display
    isAutoLoadingPages,
  } = useCachedFeed({
    feedType: "user",
    userId: user?.id,
    filter: "upcoming",
  });

  const handleLoadMore = useCallback(() => {
    if (status === "CanLoadMore") {
      loadMore(25);
    }
  }, [status, loadMore]);

  // Add missing properties that UserEventsList expects and filter out ended events
  const enrichedEvents = useMemo(() => {
    if (!events) return [];

    // Use stableTimestamp instead of recalculating Date.now()
    const currentTime = new Date(stableTimestamp).getTime();
    return events
      .filter((event) => {
        // Client-side safety filter: hide events that have ended
        // This prevents showing ended events if the cron job hasn't run recently
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

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1">
        <UserEventsList
          events={enrichedEvents}
          onEndReached={handleLoadMore}
          isFetchingNextPage={isLoadingMore || isAutoLoadingPages}
          isLoadingFirstPage={isLoadingFirstPage}
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
