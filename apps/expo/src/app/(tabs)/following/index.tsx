import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useUser } from "@clerk/clerk-expo";
import { Host, Picker, Text as SwiftUIText } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
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
import UserEventsList from "~/components/UserEventsList";
import { useStableFeedListBodyLoading } from "~/hooks/useStableFeedListBodyLoading";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useAppStore, useStableTimestamp } from "~/store";
import { eventMatchesFeedSegment } from "~/utils/feedSegment";

type Segment = "upcoming" | "past";

function SegmentedControlFallback({
  selectedSegment,
  onSegmentChange,
}: {
  selectedSegment: Segment;
  onSegmentChange: (segment: Segment) => void;
}) {
  return (
    <View className="flex-row rounded-lg bg-gray-100 p-1">
      <TouchableOpacity
        className={`items-center rounded-md px-4 py-2 ${
          selectedSegment === "upcoming" ? "bg-white shadow-sm" : ""
        }`}
        onPress={() => onSegmentChange("upcoming")}
      >
        <Text
          className={
            selectedSegment === "upcoming"
              ? "font-semibold text-gray-900"
              : "text-gray-500"
          }
        >
          Upcoming
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        className={`items-center rounded-md px-4 py-2 ${
          selectedSegment === "past" ? "bg-white shadow-sm" : ""
        }`}
        onPress={() => onSegmentChange("past")}
      >
        <Text
          className={
            selectedSegment === "past"
              ? "font-semibold text-gray-900"
              : "text-gray-500"
          }
        >
          Past
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function FollowingFeedContent() {
  const { user } = useUser();
  const router = useRouter();
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

  // Memoize query args
  const queryArgs = useMemo(() => {
    return {
      filter: selectedSegment,
    };
  }, [selectedSegment]);

  const {
    results: events,
    status,
    loadMore,
  } = useStablePaginatedQuery(
    api.feeds.getFollowedListsFeed,
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

  const enrichedEvents = useMemo(() => {
    const stableMs = new Date(stableTimestamp).getTime();
    return events
      .filter((event) =>
        eventMatchesFeedSegment(event.endDateTime, selectedSegment, stableMs),
      )
      .map((event) => ({
        ...event,
        comments: [],
        eventToLists: [],
        lists: event.lists ?? [],
      }));
  }, [events, stableTimestamp, selectedSegment]);

  // Update tab badge count based on upcoming events
  const setCommunityBadgeCount = useAppStore((s) => s.setCommunityBadgeCount);
  useEffect(() => {
    if (selectedSegment === "upcoming") {
      setCommunityBadgeCount(enrichedEvents.length);
    }
  }, [enrichedEvents.length, selectedSegment, setCommunityBadgeCount]);

  const followedListCount = followedLists?.length ?? 0;
  const singleFollowedList =
    followedListCount === 1 ? followedLists?.[0] : null;

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
              if (singleFollowedList?.slug) {
                router.push(`/list/${singleFollowedList.slug}`);
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
          {Platform.OS === "ios" ? (
            <Host matchContents>
              <Picker
                selection={selectedSegment}
                onSelectionChange={(value) => {
                  handleSegmentChange(value as Segment);
                }}
                modifiers={[pickerStyle("segmented")]}
              >
                <SwiftUIText modifiers={[tag("upcoming")]}>
                  Upcoming
                </SwiftUIText>
                <SwiftUIText modifiers={[tag("past")]}>Past</SwiftUIText>
              </Picker>
            </Host>
          ) : (
            <SegmentedControlFallback
              selectedSegment={selectedSegment}
              onSegmentChange={handleSegmentChange}
            />
          )}
        </View>
      </View>
    );
  }, [
    selectedSegment,
    handleSegmentChange,
    followedListCount,
    singleFollowedList,
    router,
  ]);

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
        events={enrichedEvents}
        onEndReached={handleLoadMore}
        isFetchingNextPage={status === "LoadingMore"}
        listBodyLoading={listBodyLoading}
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
