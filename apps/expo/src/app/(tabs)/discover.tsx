import React, { useCallback, useMemo } from "react";
import { Redirect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import DiscoverShareBanner from "~/components/DiscoverShareBanner";
import { MatchAuthLoadingSurface } from "~/components/MatchAuthLoadingSurface";
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

  // Memoize saved events query args to avoid unnecessary re-renders
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

  return (
    <UserEventsList
      events={enrichedEvents}
      onEndReached={handleLoadMore}
      isFetchingNextPage={status === "LoadingMore"}
      listBodyLoading={status === "LoadingFirstPage"}
      showCreator="always"
      primaryAction="save"
      savedEventIds={savedEventIds}
      source="discover_list"
      HeaderComponent={DiscoverShareBanner}
    />
  );
}

export default function Page() {
  const hasSeenOnboarding = useAppStore((state) => state.hasSeenOnboarding);

  return (
    <>
      <AuthLoading>
        <MatchAuthLoadingSurface />
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
