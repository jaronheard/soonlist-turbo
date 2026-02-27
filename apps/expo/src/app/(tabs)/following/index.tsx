import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { Redirect } from "expo-router";
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

import LoadingSpinner from "~/components/LoadingSpinner";
import UserEventsList from "~/components/UserEventsList";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useAppStore, useStableTimestamp } from "~/store";

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
  const [selectedSegment, setSelectedSegment] = useState<Segment>("upcoming");
  const stableTimestamp = useStableTimestamp();

  // Check if user is following anyone
  const followingUsers = useQuery(api.users.getFollowingUsers);
  const hasFollowings = (followingUsers?.length ?? 0) > 0;

  const handleSegmentChange = useCallback((segment: Segment) => {
    setSelectedSegment(segment);
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
    api.feeds.getFollowedUsersFeed,
    hasFollowings ? queryArgs : "skip",
    {
      initialNumItems: 50,
    },
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

  const savedEventIds = new Set(
    savedEventIdsQuery?.map((event) => event.id) ?? [],
  );

  // Filter events client-side
  const enrichedEvents = useMemo(() => {
    const currentTime = new Date(stableTimestamp).getTime();
    return events
      .filter((event) => {
        const eventEndTime = new Date(event.endDateTime).getTime();
        return selectedSegment === "upcoming"
          ? eventEndTime >= currentTime
          : eventEndTime < currentTime;
      })
      .map((event) => ({
        ...event,
        eventFollows: [],
        comments: [],
        eventToLists: [],
        lists: [],
      }));
  }, [events, stableTimestamp, selectedSegment]);

  // Update tab badge count based on upcoming events
  const setCommunityBadgeCount = useAppStore((s) => s.setCommunityBadgeCount);
  useEffect(() => {
    if (selectedSegment === "upcoming") {
      setCommunityBadgeCount(enrichedEvents.length);
    }
  }, [enrichedEvents.length, selectedSegment, setCommunityBadgeCount]);

  const HeaderComponent = useCallback(() => {
    return (
      <View className="px-3 pb-2 pt-3" style={{ width: 260 }}>
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
                {`Upcoming · ${enrichedEvents.length}`}
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
    );
  }, [selectedSegment, handleSegmentChange, enrichedEvents.length]);

  // Redirect to feed if not following anyone
  if (followingUsers !== undefined && !hasFollowings) {
    return <Redirect href="/feed" />;
  }

  return (
    <UserEventsList
      events={enrichedEvents}
      onEndReached={handleLoadMore}
      isFetchingNextPage={status === "LoadingMore"}
      isLoadingFirstPage={followingUsers === undefined}
      showCreator="always"
      primaryAction="save"
      showSourceStickers
      savedEventIds={savedEventIds}
      source="following"
      HeaderComponent={HeaderComponent}
    />
  );
}

function FollowingFeed() {
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
        <FollowingFeedContent />
      </Authenticated>
    </>
  );
}

export default FollowingFeed;

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";
