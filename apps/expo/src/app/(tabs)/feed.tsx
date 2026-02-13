import React, { useCallback, useMemo, useState } from "react";
import { Platform, Share, Text, TouchableOpacity, View } from "react-native";
import { Redirect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { Host, Picker } from "@expo/ui/swift-ui";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { ShareIcon } from "~/components/icons";
import LoadingSpinner from "~/components/LoadingSpinner";
import { ProfileMenu } from "~/components/ProfileMenu";
import UserEventsList from "~/components/UserEventsList";
import { useRatingPrompt } from "~/hooks/useRatingPrompt";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useAppStore, useStableTimestamp } from "~/store";
import Config from "~/utils/config";
import { logError } from "~/utils/errorLogging";

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

function MyFeedContent() {
  const { user } = useUser();
  const [selectedSegment, setSelectedSegment] = useState<Segment>("upcoming");

  // Use the stable timestamp from the store that updates every 15 minutes
  // This prevents InvalidCursor errors while still filtering for upcoming events
  const stableTimestamp = useStableTimestamp();

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

  const savedEventIds = new Set(
    savedEventIdsQuery?.map((event) => event.id) ?? [],
  );

  // Transform grouped events into the format UserEventsList expects
  // The server now handles similarity grouping, so we just enrich the events
  const enrichedEvents = useMemo(() => {
    const events = groupedEvents.map((group) => ({
      event: {
        ...group.event,
        eventFollows: [],
        comments: [],
        eventToLists: [],
        lists: [],
      },
      // Server-computed count (already shows just similar events, not including primary)
      similarEvents: Array(group.similarEventsCount).fill({
        event: null,
        similarityDetails: null,
      }),
    }));

    // Client-side safety filter: hide events that have ended (upcoming only)
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

  const handleSegmentChange = useCallback((segment: Segment) => {
    setSelectedSegment(segment);
  }, []);

  const handleShareEvents = useCallback(async () => {
    const shareUrl = `${Config.apiBaseUrl}/${user?.username ?? ""}`;
    try {
      await Share.share({ url: shareUrl });
    } catch (error) {
      logError("Error sharing events", error);
    }
  }, [user?.username]);

  const HeaderComponent = useCallback(() => {
    return (
      <View className="flex-row items-center justify-between px-2 pb-2 pt-3">
        <ProfileMenu />
        <View className="mx-2" style={{ width: 200 }}>
          {Platform.OS === "ios" ? (
            <Host matchContents>
              <Picker
                options={["Upcoming", "Past"]}
                selectedIndex={selectedSegment === "upcoming" ? 0 : 1}
                onOptionSelected={(event) => {
                  handleSegmentChange(
                    event.nativeEvent.index === 0 ? "upcoming" : "past",
                  );
                }}
                variant="segmented"
              />
            </Host>
          ) : (
            <SegmentedControlFallback
              selectedSegment={selectedSegment}
              onSegmentChange={handleSegmentChange}
            />
          )}
        </View>
        <TouchableOpacity
          onPress={handleShareEvents}
          className="flex-row items-center rounded-full bg-interactive-1 px-4 py-2"
          activeOpacity={0.8}
        >
          <ShareIcon size={18} color="#FFF" />
          <Text className="ml-2 text-base font-semibold text-white">Share</Text>
        </TouchableOpacity>
      </View>
    );
  }, [selectedSegment, handleSegmentChange, handleShareEvents]);

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
