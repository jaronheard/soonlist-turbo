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
import { useAppStore, useStableTimestamp } from "~/store";
import { getPlanStatusFromUser } from "~/utils/plan";

function DiscoverContent() {
  const { user } = useUser();
  const discoverAccessOverride = useAppStore((s) => s.discoverAccessOverride);

  // Compute access early to skip queries if denied
  const showDiscover = user ? getPlanStatusFromUser(user).showDiscover : false;
  const canAccessDiscover = discoverAccessOverride || showDiscover;

  // Fetch user stats (skip when access is denied or user missing)
  const stats = useQuery(
    api.events.getStats,
    canAccessDiscover && user?.username ? { userName: user.username } : "skip",
  );

  // Use the stable timestamp from the store that updates every 15 minutes
  // This prevents InvalidCursor errors while still filtering for upcoming events
  const stableTimestamp = useStableTimestamp();

  const {
    results: events,
    status,
    loadMore,
  } = useStablePaginatedQuery(
    api.feeds.getDiscoverFeed,
    canAccessDiscover
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
    if (!canAccessDiscover || !user?.username) return "skip";
    return { userName: user.username };
  }, [canAccessDiscover, user?.username]);

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
        // Preserve eventFollows from the query (includes user data for each saver)
        eventFollows: event.eventFollows ?? [],
        comments: event.comments ?? [],
        eventToLists: event.eventToLists ?? [],
        lists: event.lists ?? [],
      }));
  }, [events, stableTimestamp]);

  // Check if user has access to discover feature (only if authenticated)
  if (user && !canAccessDiscover) {
    return <Redirect href="/feed" />;
  }

  function SaveShareButtonWrapper({
    event,
  }: {
    event: { id: string; userId: string };
  }) {
    // Only show save/share button for authenticated users
    if (!user) {
      return null;
    }

    // User's own events should always show as saved
    const isOwnEvent = event.userId === user.id;
    const isSaved = isOwnEvent || savedEventIds.has(event.id);

    return (
      <SaveShareButton
        eventId={event.id}
        isSaved={isSaved}
        source="discover_list"
      />
    );
  }

  return (
    <View className="flex-1 bg-white">
      <UserEventsList
        events={enrichedEvents}
        onEndReached={handleLoadMore}
        isFetchingNextPage={status === "LoadingMore"}
        isLoadingFirstPage={status === "LoadingFirstPage"}
        ActionButton={SaveShareButtonWrapper}
        showCreator="always"
        hideDiscoverableButton={true}
        isDiscoverFeed={true}
        savedEventIds={savedEventIds}
        HeaderComponent={DiscoverShareBanner}
      />
      {user && <AddEventButton showChevron={false} stats={stats} />}
    </View>
  );
}

export default function Page() {
  const hasSeenOnboarding = useAppStore((state) => state.hasSeenOnboarding);

  return (
    <>
      <AuthLoading>
        <View className="flex-1 bg-interactive-3">
          <View className="h-[100px]" />
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
