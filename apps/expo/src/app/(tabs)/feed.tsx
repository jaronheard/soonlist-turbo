import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";
import { usePostHog } from "posthog-react-native";

import { api } from "@soonlist/backend/convex/_generated/api";

import AddEventButton from "~/components/AddEventButton";
import FeedSkeleton from "~/components/FeedSkeleton";
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
  const posthog = usePostHog();
  const loadStartTime = useRef<number | null>(null);

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
    results: events,
    status,
    loadMore,
  } = useStablePaginatedQuery(api.feeds.getMyFeed, queryArgs, {
    initialNumItems: 20, // Reduced from 50 to improve cold start performance
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

  // Track feed load performance
  useEffect(() => {
    if (status === "LoadingFirstPage" && !loadStartTime.current) {
      loadStartTime.current = Date.now();
    } else if (
      status !== "LoadingFirstPage" &&
      status !== "LoadingMore" &&
      loadStartTime.current
    ) {
      const loadTime = Date.now() - loadStartTime.current;
      posthog.capture("feed_load_time", {
        duration_ms: loadTime,
        initial_items: events.length,
      });
      loadStartTime.current = null;
    }
  }, [status, events.length, posthog]);

  // Add missing properties that UserEventsList expects and filter out ended events
  const enrichedEvents = useMemo(() => {
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
          isFetchingNextPage={status === "LoadingMore"}
          isLoadingFirstPage={status === "LoadingFirstPage"}
          showCreator="savedFromOthers"
          stats={stats}
          promoCard={{ type: "addEvents" }}
          hasUnlimited={hasUnlimited}
          savedEventIds={savedEventIds}
        />
        <AddEventButton stats={stats} showChevron={false} />
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
          {/* Show skeleton UI instead of spinner for better perceived performance */}
          <FeedSkeleton />
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
