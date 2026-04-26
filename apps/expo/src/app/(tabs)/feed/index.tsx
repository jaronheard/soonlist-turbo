import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Text, View } from "react-native";
import * as Location from "expo-location";
import { Redirect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useUser } from "@clerk/clerk-expo";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";
import { usePostHog } from "posthog-react-native";

import { api } from "@soonlist/backend/convex/_generated/api";

import { MatchAuthLoadingSurface } from "~/components/MatchAuthLoadingSurface";
import { UpcomingPastSegmentedControl } from "~/components/UpcomingPastSegmentedControl";
import UserEventsList from "~/components/UserEventsList";
import { useShareListPrompt } from "~/hooks/useShareListPrompt";
import { useShareMyList } from "~/hooks/useShareMyList";
import { useStableFeedListBodyLoading } from "~/hooks/useStableFeedListBodyLoading";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useAppStore, useStableTimestamp } from "~/store";
import { eventMatchesFeedSegment } from "~/utils/feedSegment";

type Segment = "upcoming" | "past";

function MyFeedContent() {
  const { user } = useUser();
  const [selectedSegment, setSelectedSegment] = useState<Segment>("upcoming");
  // Use the stable timestamp from the store that updates every 15 minutes
  // This prevents InvalidCursor errors while still filtering for upcoming events
  const stableTimestamp = useStableTimestamp();

  // Request location permission once on first feed landing
  const hasRequestedLocation = useRef(false);
  useEffect(() => {
    if (hasRequestedLocation.current) return;
    hasRequestedLocation.current = true;
    void (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === Location.PermissionStatus.UNDETERMINED) {
        await Location.requestForegroundPermissionsAsync();
      }
    })();
  }, []);

  // Check for contributing lists
  const contributingLists = useQuery(api.lists.getContributingLists);
  const contributingCount = contributingLists?.length ?? 0;
  const singleContributingList =
    contributingCount === 1 ? contributingLists?.[0] : null;

  // Memoize query args - changes when segment changes, triggering refetch
  const queryArgs = useMemo(() => {
    return {
      filter: selectedSegment,
    };
  }, [selectedSegment]);

  const {
    results: groupedEvents,
    status,
    loadMore,
  } = useStablePaginatedQuery(api.feeds.getMyFeedGrouped, queryArgs, {
    initialNumItems: 50,
  });

  const { listBodyLoading, markSegmentSwitchPending } =
    useStableFeedListBodyLoading(status);

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

  const savedEventIds = useMemo(
    () => new Set(savedEventIdsQuery?.map((event) => event.id) ?? []),
    [savedEventIdsQuery],
  );

  // Transform grouped events into the format UserEventsList expects
  // The server now handles similarity grouping, so we just enrich the events
  const enrichedEvents = useMemo(() => {
    const events = groupedEvents.map((group) => ({
      event: {
        ...group.event,
        comments: [],
        eventToLists: [],
        lists: group.event.lists ?? [],
        // queryGroupedFeed returns source-list attribution at the group
        // level, but UserEventsList reads these fields off `item.event`.
        // Merge them in so the "via [List]" link and the "+N" badge render
        // on the My Feed tab (same surface as the Following tab, which
        // uses queryFeed where these fields already live at event level).
        sourceListId: group.sourceListId,
        sourceListName: group.sourceListName,
        sourceListSlug: group.sourceListSlug,
        additionalSourceCount: group.additionalSourceCount,
      },
      // Server-computed count (already shows just similar events, not including primary)
      similarEvents: Array(group.similarEventsCount).fill({
        event: null,
        similarityDetails: null,
      }),
    }));

    const stableMs = new Date(stableTimestamp).getTime();
    return events.filter((item) =>
      eventMatchesFeedSegment(
        item.event.endDateTime,
        selectedSegment,
        stableMs,
      ),
    );
  }, [groupedEvents, stableTimestamp, selectedSegment]);

  const upcomingCount =
    selectedSegment === "upcoming" ? enrichedEvents.length : 0;

  const posthog = usePostHog();
  const { shouldShowOneShot, markOneShotSeen } =
    useShareListPrompt(upcomingCount);

  const { requestShare } = useShareMyList();

  // On threshold crossing, route to the share-setup modal (which is the
  // "your Soonlist is ready to share" moment). Skip for users who've already
  // shared — requestShare would auto-launch native share, which we don't
  // want here. Either way mark the one-shot seen.
  const currentUser = useQuery(api.users.getCurrentUser);
  const hasSharedListBefore = currentUser?.hasSharedListBefore ?? false;
  useEffect(() => {
    if (!shouldShowOneShot) return;
    const t = setTimeout(() => {
      markOneShotSeen();
      if (!hasSharedListBefore) {
        posthog.capture("share_prompt_one_shot_shown");
        requestShare({ eventCount: upcomingCount });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [
    shouldShowOneShot,
    hasSharedListBefore,
    markOneShotSeen,
    posthog,
    requestShare,
    upcomingCount,
  ]);

  const handlePillShare = useCallback(() => {
    posthog.capture("share_prompt_pill_tapped");
    requestShare({ eventCount: upcomingCount });
  }, [posthog, requestShare, upcomingCount]);

  // Update tab badge count based on upcoming events
  const setMyListBadgeCount = useAppStore((s) => s.setMyListBadgeCount);
  useEffect(() => {
    if (selectedSegment === "upcoming") {
      setMyListBadgeCount(enrichedEvents.length);
    }
  }, [enrichedEvents.length, selectedSegment, setMyListBadgeCount]);

  const handleSegmentChange = useCallback(
    (segment: Segment) => {
      markSegmentSwitchPending();
      setSelectedSegment(segment);
    },
    [markSegmentSwitchPending],
  );

  const HeaderComponent = useCallback(() => {
    return (
      <View className="px-3 pb-2" style={{ marginTop: -4 }}>
        <Text
          className="mb-1 text-base font-medium text-neutral-2"
          style={{ paddingLeft: 6 }}
        >
          Events I&apos;m interested in
        </Text>
        {contributingCount > 0 && (
          <View
            className="mb-2 flex-row items-center"
            style={{ paddingLeft: 6 }}
          >
            <Text className="text-sm text-neutral-2">
              Sharing public events to:{" "}
            </Text>
            <SymbolView name="list.bullet" size={14} tintColor="#5A32FB" />
            <Text className="text-sm font-semibold text-interactive-1">
              {" "}
              {singleContributingList
                ? singleContributingList.name
                : `${contributingCount} lists`}
            </Text>
          </View>
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
    contributingCount,
    singleContributingList,
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

  return (
    <UserEventsList
      groupedEvents={enrichedEvents}
      onEndReached={handleLoadMore}
      isFetchingNextPage={status === "LoadingMore"}
      listBodyLoading={listBodyLoading || hasStaleSegmentData}
      showCreator="savedFromOthers"
      showSourceStickers
      savedEventIds={savedEventIds}
      source={selectedSegment === "upcoming" ? "feed" : "past"}
      HeaderComponent={HeaderComponent}
      upcomingEventCount={upcomingCount}
      onSharePress={handlePillShare}
      attributionVariant="people-only"
    />
  );
}

function MyFeed() {
  const { hasSeenOnboarding } = useAppStore();

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
        <MyFeedContent />
      </Authenticated>
    </>
  );
}

export default MyFeed;

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";
