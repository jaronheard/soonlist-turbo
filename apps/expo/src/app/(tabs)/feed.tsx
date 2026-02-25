import React, { useCallback, useEffect, useMemo, useState } from "react";
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

import type { Segment } from "~/components/SegmentedControl";
import LoadingSpinner from "~/components/LoadingSpinner";
import { TabHeader } from "~/components/TabHeader";
import UserEventsList from "~/components/UserEventsList";
import { useRatingPrompt } from "~/hooks/useRatingPrompt";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useAppStore, useStableTimestamp } from "~/store";
import Config from "~/utils/config";

function MyFeedContent() {
  const { user } = useUser();
  const [selectedSegment, setSelectedSegment] = useState<Segment>("upcoming");

  const stableTimestamp = useStableTimestamp();

  const queryArgs = useMemo(
    () => ({ filter: selectedSegment }),
    [selectedSegment],
  );

  const {
    results: groupedEvents,
    status,
    loadMore,
  } = useStablePaginatedQuery(api.feeds.getMyFeedGrouped, queryArgs, {
    initialNumItems: 50,
  });

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

  const enrichedEvents = useMemo(() => {
    const events = groupedEvents.map((group) => ({
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

    if (selectedSegment === "upcoming") {
      const currentTime = new Date(stableTimestamp).getTime();
      return events.filter((item) => {
        const eventEndTime = new Date(item.event.endDateTime).getTime();
        return eventEndTime >= currentTime;
      });
    }

    return events;
  }, [groupedEvents, stableTimestamp, selectedSegment]);

  // Trigger rating prompt when user has 3+ upcoming events
  useRatingPrompt(selectedSegment === "upcoming" ? enrichedEvents.length : 0);

  // Update tab badge count based on upcoming events
  const setMyListBadgeCount = useAppStore((s) => s.setMyListBadgeCount);
  useEffect(() => {
    if (selectedSegment === "upcoming") {
      setMyListBadgeCount(enrichedEvents.length);
    }
  }, [enrichedEvents.length, selectedSegment, setMyListBadgeCount]);

  const handleSegmentChange = useCallback((segment: Segment) => {
    setSelectedSegment(segment);
  }, []);

  const displayName = user?.firstName ?? user?.username ?? "My";
  const username = user?.username ?? "";
  const title = `${displayName}'s Soonlist`;
  const shareUrl = `${Config.apiBaseUrl}/${username}`;
  const displayUrl = `soonlist.com/${username}`;

  const HeaderComponent = useCallback(
    () => (
      <TabHeader
        title={title}
        shareUrl={shareUrl}
        displayUrl={displayUrl}
        selectedSegment={selectedSegment}
        onSegmentChange={handleSegmentChange}
      />
    ),
    [title, shareUrl, displayUrl, selectedSegment, handleSegmentChange],
  );

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
        source={selectedSegment === "upcoming" ? "feed" : "past"}
        HeaderComponent={HeaderComponent}
      />
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
