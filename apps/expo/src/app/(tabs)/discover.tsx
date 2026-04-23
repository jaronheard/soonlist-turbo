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

  const showDiscover = user ? getPlanStatusFromUser(user).showDiscover : false;
  const canAccessDiscover = discoverAccessOverride || showDiscover;

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

  const savedEventIds = useMemo(
    () => new Set(savedEventIdsQuery?.map((event) => event.id) ?? []),
    [savedEventIdsQuery],
  );

  const enrichedEvents = useMemo(() => {
    const currentTime = new Date(stableTimestamp).getTime();
    return events
      .filter((event) => {
        const eventEndTime = new Date(event.endDateTime).getTime();
        return eventEndTime >= currentTime;
      })
      .map((event) => ({
        ...event,
        eventFollows: event.eventFollows ?? [],
        comments: event.comments ?? [],
        eventToLists: event.eventToLists ?? [],
        lists: event.lists ?? [],
      }));
  }, [events, stableTimestamp]);

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

export { ErrorBoundary } from "expo-router";
