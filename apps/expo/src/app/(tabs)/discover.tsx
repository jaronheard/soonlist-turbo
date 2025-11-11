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
import DiscoverShareBanner from "~/components/DiscoverShareBanner";
import LoadingSpinner from "~/components/LoadingSpinner";
import SaveShareButton from "~/components/SaveShareButton";
import UserEventsList from "~/components/UserEventsList";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore, useStableTimestamp } from "~/store";

function DiscoverContent() {
  const { user } = useUser();
  const discoverAccessOverride = useAppStore((s) => s.discoverAccessOverride);
  const { customerInfo } = useRevenueCat();
  const hasUnlimited =
    customerInfo?.entitlements.active.unlimited?.isActive ?? false;

  // Check if user follows any lists
  const followedLists = useQuery(api.lists.getFollowedLists);
  // Only consider hasFollowedLists true if query has loaded (followedLists !== undefined)
  const hasFollowedLists =
    discoverAccessOverride ||
    (followedLists !== undefined && followedLists.length > 0);

  // Fetch user stats (skip when access is denied or user missing)
  const stats = useQuery(
    api.events.getStats,
    hasFollowedLists && user?.username ? { userName: user.username } : "skip",
  );

  // Use the stable timestamp from the store that updates every 15 minutes
  // This prevents InvalidCursor errors while still filtering for upcoming events
  const stableTimestamp = useStableTimestamp();

  const {
    results: events,
    status,
    loadMore,
    isLoading,
  } = useStablePaginatedQuery(
    api.feeds.getFollowedListsFeed,
    hasFollowedLists
      ? {
          filter: "upcoming" as const,
        }
      : "skip",
    {
      initialNumItems: 50,
    },
  );

  // Memoize saved events query args to prevent unnecessary re-renders
  const savedEventsQueryArgs = useMemo(() => {
    if (!hasFollowedLists || !user?.username) return "skip";
    return { userName: user.username };
  }, [hasFollowedLists, user?.username]);

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

  // Check if user has access to discover feature (only if authenticated)
  // Redirect if user doesn't follow any lists (only after query has loaded)
  // Don't redirect while query is still loading (followedLists === undefined)
  if (
    user &&
    followedLists !== undefined &&
    !discoverAccessOverride &&
    followedLists.length === 0
  ) {
    return <Redirect href="/feed" />;
  }

  function SaveShareButtonWrapper({ event }: { event: { id: string } }) {
    // Only show save/share button for authenticated users
    if (!user) {
      return null;
    }

    return (
      <SaveShareButton
        eventId={event.id}
        isSaved={savedEventIds.has(event.id)}
        source="discover_list"
      />
    );
  }

  return (
    <View className="flex-1 bg-white">
      {isLoading && status === "LoadingFirstPage" ? (
        <LoadingSpinner />
      ) : (
        <View className="flex-1">
          <UserEventsList
            events={enrichedEvents}
            onEndReached={handleLoadMore}
            isFetchingNextPage={status === "LoadingMore"}
            ActionButton={SaveShareButtonWrapper}
            showCreator="always"
            hasUnlimited={hasUnlimited}
            hideDiscoverableButton={true}
            isDiscoverFeed={true}
            savedEventIds={savedEventIds}
            HeaderComponent={DiscoverShareBanner}
          />
          {user && <AddEventButton showChevron={false} stats={stats} />}
        </View>
      )}
    </View>
  );
}

export default function Page() {
  const hasSeenOnboarding = useAppStore((state) => state.hasSeenOnboarding);

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
        <DiscoverContent />
      </Authenticated>
    </>
  );
}

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";
