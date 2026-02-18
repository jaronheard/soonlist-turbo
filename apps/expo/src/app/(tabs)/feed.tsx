import React, { useCallback, useMemo, useState } from "react";
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

import LoadingSpinner from "~/components/LoadingSpinner";
import { TabHeader } from "~/components/TabHeader";
import UserEventsList from "~/components/UserEventsList";
import { useRatingPrompt } from "~/hooks/useRatingPrompt";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useAppStore, useStableTimestamp } from "~/store";

function MyFeedContent() {
  const { user } = useUser();
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");
  const stableTimestamp = useStableTimestamp();

  const {
    results: groupedEvents,
    status,
    loadMore,
  } = useStablePaginatedQuery(
    api.feeds.getMyFeedGrouped,
    {
      filter,
    },
    { initialNumItems: 50 },
  );

  const savedEventIdsQuery = useQuery(
    api.events.getSavedIdsForUser,
    user?.username ? { userName: user.username } : "skip",
  );

  const handleLoadMore = useCallback(() => {
    if (status === "CanLoadMore") {
      loadMore(25);
    }
  }, [loadMore, status]);

  const savedEventIds = useMemo(
    () => new Set(savedEventIdsQuery?.map((event) => event.id) ?? []),
    [savedEventIdsQuery],
  );

  const enrichedEvents = useMemo(() => {
    const currentTime = new Date(stableTimestamp).getTime();
    return groupedEvents
      .filter((group) => {
        if (filter === "past") {
          return true;
        }
        return new Date(group.event.endDateTime).getTime() >= currentTime;
      })
      .map((group) => ({
        event: {
          ...group.event,
          eventFollows: [],
          comments: [],
          eventToLists: [],
          lists: [],
        },
        similarEvents: Array(group.similarEventsCount).fill({
          event: null,
          similarityDetails: null,
        }),
      }));
  }, [filter, groupedEvents, stableTimestamp]);

  useRatingPrompt(filter === "upcoming" ? enrichedEvents.length : 0);

  const displayName = user?.fullName ?? user?.firstName ?? "Your";
  const username = user?.username ?? "soonlist";

  return (
    <View className="flex-1 bg-white">
      <UserEventsList
        groupedEvents={enrichedEvents}
        onEndReached={handleLoadMore}
        isFetchingNextPage={status === "LoadingMore"}
        isLoadingFirstPage={status === "LoadingFirstPage"}
        showCreator="savedFromOthers"
        showSourceStickers
        savedEventIds={savedEventIds}
        source="feed"
        HeaderComponent={() => (
          <TabHeader
            type="list"
            displayName={displayName}
            username={username}
            filter={filter}
            onFilterChange={setFilter}
          />
        )}
      />
    </View>
  );
}

function MyFeed() {
  const { hasSeenOnboarding } = useAppStore();

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
        <MyFeedContent />
      </Authenticated>
    </>
  );
}

export default MyFeed;
export { ErrorBoundary } from "expo-router";
