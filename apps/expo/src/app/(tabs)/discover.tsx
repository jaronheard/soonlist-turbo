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

  const showDiscover = user ? getPlanStatusFromUser(user).showDiscover : false;
  const canAccessDiscover = discoverAccessOverride || showDiscover;

  const stableTimestamp = useStableTimestamp();

  const {
    results: events,
    status,
    loadMore,
  } = useStablePaginatedQuery(
    api.feeds.getDiscoverFeed,
    canAccessDiscover ? { filter: "upcoming" as const } : "skip",
    {
      initialNumItems: 50,
    },
  );

  const savedEventIdsQuery = useQuery(
    api.events.getSavedIdsForUser,
    canAccessDiscover && user?.username ? { userName: user.username } : "skip",
  );

  const handleLoadMore = useCallback(() => {
    if (status === "CanLoadMore") {
      loadMore(25);
    }
  }, [status, loadMore]);

  const savedEventIds = new Set(
    savedEventIdsQuery?.map((event) => event.id) ?? [],
  );

  const enrichedEvents = useMemo(() => {
    const currentTime = new Date(stableTimestamp).getTime();
    return events
      .filter((event) => new Date(event.endDateTime).getTime() >= currentTime)
      .map((event) => ({
        ...event,
        eventFollows: event.eventFollows,
        comments: event.comments,
        eventToLists: event.eventToLists,
        lists: event.lists,
      }));
  }, [events, stableTimestamp]);

  if (user && !canAccessDiscover) {
    return <Redirect href="/feed" />;
  }

  function SaveShareButtonWrapper({
    event,
  }: {
    event: { id: string; userId: string };
  }) {
    if (!user) {
      return null;
    }

    const isOwnEvent = event.userId === user.id;
    const isSaved = savedEventIds.has(event.id);

    return (
      <SaveShareButton
        eventId={event.id}
        isSaved={isSaved}
        isOwnEvent={isOwnEvent}
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
