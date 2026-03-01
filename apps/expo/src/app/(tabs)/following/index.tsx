import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, ScrollView, Share, Text, TouchableOpacity, View } from "react-native";
import * as Haptics from "expo-haptics";
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
import { usePostHog } from "posthog-react-native";

import { api } from "@soonlist/backend/convex/_generated/api";

import { ShareIcon } from "~/components/icons";
import LoadingSpinner from "~/components/LoadingSpinner";
import UserEventsList from "~/components/UserEventsList";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useAppStore, useStableTimestamp } from "~/store";
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

function FollowingEmptyState() {
  const { user } = useUser();
  const posthog = usePostHog();
  const username = user?.username ?? "";

  const handleInvite = async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // AppsFlyer OneLink with follow intent — recipient will be prompted to follow this user
    const followUrl = `https://soonlist.onelink.me/QM97?pid=soonlist_app&c=following_empty_state&deep_link_value=follow&deep_link_sub1=${encodeURIComponent(username)}`;
    const shareMessage =
      "Hey, check out Soonlist! It turns your screenshots into saved plans and makes finding and sharing events way easier.";

    try {
      posthog.capture("invite_friend_initiated", {
        source: "following_empty_state",
      });

      const result = await Share.share({
        message: shareMessage,
        url: followUrl,
        title: "Soonlist — Save events instantly",
      });

      if (result.action === Share.sharedAction) {
        posthog.capture("invite_friend_completed", {
          source: "following_empty_state",
        });
      }
    } catch (error) {
      logError("Error sharing from following empty state", error);
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: "#F4F1FF" }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
        paddingBottom: 120,
      }}
    >
      <Text
        style={{
          fontSize: 18,
          fontWeight: "600",
          color: "#627496",
          textAlign: "center",
          marginBottom: 24,
          lineHeight: 26,
        }}
      >
        Events other people have captured will appear here
      </Text>
      <TouchableOpacity
        onPress={() => void handleInvite()}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Invite friends to Soonlist"
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: "#5A32FB",
            paddingHorizontal: 24,
            paddingVertical: 14,
            borderRadius: 999,
          }}
        >
          <ShareIcon size={18} color="#FFFFFF" />
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: "#FFFFFF",
            }}
          >
            Invite friends
          </Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
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
    );
  }, [selectedSegment, handleSegmentChange, enrichedEvents.length]);

  // Show empty state if not following anyone
  if (followingUsers !== undefined && !hasFollowings) {
    return <FollowingEmptyState />;
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
