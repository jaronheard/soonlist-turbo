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
  const stableTimestamp = useStableTimestamp();

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

  const contributingLists = useQuery(api.lists.getContributingLists);
  const contributingCount = contributingLists?.length ?? 0;
  const singleContributingList =
    contributingCount === 1 ? contributingLists?.[0] : null;

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

  const enrichedEvents = useMemo(() => {
    const events = groupedEvents.map((group) => ({
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

  return (
    <UserEventsList
      groupedEvents={enrichedEvents}
      onEndReached={handleLoadMore}
      isFetchingNextPage={status === "LoadingMore"}
      listBodyLoading={listBodyLoading}
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
