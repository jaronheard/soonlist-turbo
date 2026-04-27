import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Share, Text, TouchableOpacity, View } from "react-native";
import { Redirect, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useUser } from "@clerk/clerk-expo";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { DefaultEmptyState } from "~/components/DefaultEmptyState";
import { FollowedListsModal } from "~/components/FollowedListsModal";
import { MatchAuthLoadingSurface } from "~/components/MatchAuthLoadingSurface";
import { ReferralEmptyState } from "~/components/ReferralEmptyState";
import { UpcomingPastSegmentedControl } from "~/components/UpcomingPastSegmentedControl";
import UserEventsList from "~/components/UserEventsList";
import { useStableFeedListBodyLoading } from "~/hooks/useStableFeedListBodyLoading";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useAppStore, useStableTimestamp } from "~/store";
import { logError } from "~/utils/errorLogging";
import { eventMatchesFeedSegment } from "~/utils/feedSegment";

type Segment = "upcoming" | "past";

function FollowingFeedContent() {
  const { user } = useUser();
  const [selectedSegment, setSelectedSegment] = useState<Segment>("upcoming");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const stableTimestamp = useStableTimestamp();

  const pendingFollowUsername = useAppStore(
    (state) => state.pendingFollowUsername,
  );

  // Check if user is following any lists
  const followedLists = useQuery(api.lists.getFollowedLists);
  const hasFollowings = (followedLists?.length ?? 0) > 0;

  // Sticky so users can subscribe to multiple featured lists without the
  // screen flipping to the feed mid-flow. Re-latches to "show" after an
  // unfollow-all so the feed isn't stuck on stale paginated results.
  const [emptyStateMode, setEmptyStateMode] = useState<
    "unset" | "show" | "dismissed"
  >("unset");
  // Tracks whether we've ever observed `hasFollowings=true` so the
  // dismissed→show re-latch only fires on a genuine unfollow-all. Without
  // this, calling `setEmptyStateMode("dismissed")` from an empty-state's
  // subscribe action would immediately flip back to "show" because Convex
  // hasn't propagated the new follow yet — leaving users stuck returning
  // to an empty state after successfully subscribing.
  const sawFollowingsRef = useRef(false);
  useEffect(() => {
    if (hasFollowings) {
      sawFollowingsRef.current = true;
    }
  }, [hasFollowings]);
  useEffect(() => {
    if (followedLists === undefined) return;
    if (emptyStateMode === "unset") {
      setEmptyStateMode(hasFollowings ? "dismissed" : "show");
      return;
    }
    if (
      emptyStateMode === "dismissed" &&
      !hasFollowings &&
      sawFollowingsRef.current
    ) {
      setEmptyStateMode("show");
      sawFollowingsRef.current = false;
      // Reset to the default segment so the onboarding confirmation count and
      // the subsequent feed view both reflect upcoming events, not whatever
      // segment the user had picked under their prior subscriptions.
      // No markSegmentSwitchPending: unfollow-all clears followings, so the
      // paginated feed query is skipped — not a segment refetch race.
      setSelectedSegment("upcoming");
    }
  }, [followedLists, hasFollowings, emptyStateMode]);
  const handleExitEmptyState = useCallback(() => {
    setEmptyStateMode("dismissed");
  }, []);

  // Read latest values from refs inside useFocusEffect so the callback only
  // fires on actual focus events, not on state changes while focused. This
  // preserves the sticky-while-on-tab behavior — subscribing from inside the
  // empty state keeps it visible so users can pick more lists in one flow —
  // while still auto-dismissing when the user leaves the tab and returns
  // (a clear signal they're done picking and want to see their feed, no
  // extra "View My Scene" tap required).
  const hasFollowingsRef = useRef(hasFollowings);
  hasFollowingsRef.current = hasFollowings;
  const emptyStateModeRef = useRef(emptyStateMode);
  emptyStateModeRef.current = emptyStateMode;
  useFocusEffect(
    useCallback(() => {
      if (hasFollowingsRef.current && emptyStateModeRef.current === "show") {
        setEmptyStateMode("dismissed");
      }
    }, []),
  );

  // Memoize query args
  const queryArgs = useMemo(() => {
    return {
      filter: selectedSegment,
    };
  }, [selectedSegment]);

  const {
    results: groupedEvents,
    status,
    loadMore,
  } = useStablePaginatedQuery(
    api.feeds.getFollowedListsFeedGrouped,
    hasFollowings ? queryArgs : "skip",
    {
      initialNumItems: 50,
    },
  );

  const { listBodyLoading, markSegmentSwitchPending } =
    useStableFeedListBodyLoading(status, {
      enabled: hasFollowings,
      extraLoading: followedLists === undefined,
    });

  const handleSegmentChange = useCallback(
    (segment: Segment) => {
      markSegmentSwitchPending();
      setSelectedSegment(segment);
    },
    [markSegmentSwitchPending],
  );

  // Memoize saved events query args
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

  const savedEventIds = useMemo(
    () => new Set(savedEventIdsQuery?.map((event) => event.id) ?? []),
    [savedEventIdsQuery],
  );

  // Mirror feed/index.tsx: queryGroupedFeed returns
  // { event, similarEventsCount, sourceListId, sourceListName, sourceListSlug,
  //   additionalSourceCount, similarityGroupId } per group. UserEventsList
  // expects an array of { event, similarEvents }, with source-list attribution
  // merged onto `event`.
  const enrichedEvents = useMemo(() => {
    const stableMs = new Date(stableTimestamp).getTime();
    return groupedEvents
      .filter((group) =>
        eventMatchesFeedSegment(
          group.event.endDateTime,
          selectedSegment,
          stableMs,
        ),
      )
      .map((group) => ({
        event: {
          ...group.event,
          comments: [],
          eventToLists: [],
          lists: group.event.lists ?? [],
          sourceListId: group.sourceListId,
          sourceListName: group.sourceListName,
          sourceListSlug: group.sourceListSlug,
          additionalSourceCount: group.additionalSourceCount,
        },
        similarEvents: Array(group.similarEventsCount).fill({
          event: null,
          similarityDetails: null,
        }),
      }));
  }, [groupedEvents, stableTimestamp, selectedSegment]);

  const followedListCount = followedLists?.length ?? 0;
  const singleFollowedList =
    followedListCount === 1 ? followedLists?.[0] : null;

  const handleShareList = useCallback(
    async (listName: string, listSlug?: string) => {
      const shareUrl = listSlug
        ? `https://soonlist.com/list/${listSlug}`
        : "https://soonlist.com";
      try {
        await Share.share({
          message: `Check out ${listName} on Soonlist`,
          url: shareUrl,
        });
      } catch (error) {
        logError("Error sharing list", error);
      }
    },
    [],
  );

  const HeaderComponent = useCallback(() => {
    return (
      <View className="px-3 pb-2" style={{ marginTop: -4 }}>
        <Text
          className="mb-1 text-base font-medium text-neutral-2"
          style={{ paddingLeft: 6 }}
        >
          Events from Soonlists I subscribe to
        </Text>
        {followedListCount > 0 && (
          <TouchableOpacity
            onPress={() => {
              if (singleFollowedList) {
                void handleShareList(
                  singleFollowedList.name,
                  singleFollowedList.slug ?? undefined,
                );
              } else {
                setIsModalVisible(true);
              }
            }}
            activeOpacity={0.7}
            className="mb-2"
            style={{ paddingLeft: 6 }}
          >
            <View className="flex-row items-center">
              <Text className="text-sm text-neutral-2">Includes: </Text>
              <SymbolView name="list.bullet" size={14} tintColor="#5A32FB" />
              <Text className="text-sm font-semibold text-interactive-1">
                {" "}
                {singleFollowedList
                  ? singleFollowedList.name
                  : `${followedListCount} lists`}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        <View style={{ width: 260 }}>
          <UpcomingPastSegmentedControl
            selectedSegment={selectedSegment}
            onSegmentChange={handleSegmentChange}
          />
        </View>
      </View>
    );
  }, [
    selectedSegment,
    handleSegmentChange,
    followedListCount,
    singleFollowedList,
    handleShareList,
  ]);

  // Stable paginated results lag args changes by one tick: when switching
  // segments, the previous segment's rows are still in `groupedEvents` but
  // `enrichedEvents` filters them all out, briefly leaving an empty list.
  // Treat that exact shape as "still loading" so the spinner wins over the
  // empty state until the new segment's data lands. Gate on
  // `LoadingFirstPage` so a stale `stableTimestamp` (refreshes every 15 min)
  // can't keep the spinner up after the query has settled.
  const hasStaleSegmentData =
    status === "LoadingFirstPage" &&
    groupedEvents.length > 0 &&
    enrichedEvents.length === 0;

  // Second branch avoids a one-frame flash before the latch effect commits.
  const showEmptyState =
    emptyStateMode === "show" ||
    (followedLists !== undefined && !hasFollowings);
  if (showEmptyState) {
    if (pendingFollowUsername) {
      return (
        <ReferralEmptyState
          hasFollowings={hasFollowings}
          followedEventCount={enrichedEvents.length}
          hasMoreFollowedEvents={status === "CanLoadMore"}
          followedLists={followedLists}
          onExitToFeed={handleExitEmptyState}
        />
      );
    }
    return (
      <DefaultEmptyState
        hasFollowings={hasFollowings}
        followedEventCount={enrichedEvents.length}
        hasMoreFollowedEvents={status === "CanLoadMore"}
        followedLists={followedLists}
        onExitToFeed={handleExitEmptyState}
      />
    );
  }

  return (
    <>
      <FollowedListsModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
      />
      <UserEventsList
        groupedEvents={enrichedEvents}
        onEndReached={handleLoadMore}
        isFetchingNextPage={status === "LoadingMore"}
        listBodyLoading={listBodyLoading || hasStaleSegmentData}
        showCreator="always"
        primaryAction="save"
        showSourceStickers
        savedEventIds={savedEventIds}
        source="following"
        HeaderComponent={HeaderComponent}
        attributionVariant="list-primary"
      />
    </>
  );
}

function FollowingFeed() {
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
        <FollowingFeedContent />
      </Authenticated>
    </>
  );
}

export default FollowingFeed;

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";
