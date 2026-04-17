import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Redirect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useUser } from "@clerk/clerk-expo";
import { Host, Picker, Text as SwiftUIText } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { FollowedListsModal } from "~/components/FollowedListsModal";
import { User } from "~/components/icons";
import LoadingSpinner from "~/components/LoadingSpinner";
import ScenePreviewThreeUp from "~/components/ScenePreviewThreeUp";
import UserEventsList from "~/components/UserEventsList";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useAppStore, useStableTimestamp } from "~/store";
import Config from "~/utils/config";
import { logError } from "~/utils/errorLogging";

interface FeaturedList {
  username: string;
  displayName: string;
}

const FEATURED_LISTS_BY_ENV: Record<"production" | "development", FeaturedList[]> = {
  production: [
    { username: "thepianofarm", displayName: "Anis Mojgani" },
    { username: "kaylakennett", displayName: "Kayla Kennett" },
    { username: "joshcarr", displayName: "Josh Carr" },
  ],
  development: [
    { username: "jaron", displayName: "Jaron Heard" },
    { username: "jaron-heard", displayName: "Jaron (Dev)" },
    { username: "soonlist", displayName: "Soonlist" },
  ],
};

const FEATURED_LISTS = FEATURED_LISTS_BY_ENV[Config.env];

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

function FeaturedListRow({
  username,
  displayName,
  currentUserId,
}: {
  username: string;
  displayName: string;
  currentUserId: string | undefined;
}) {
  const router = useRouter();
  const stableTimestamp = useStableTimestamp();

  const targetUser = useQuery(api.users.getByUsername, { userName: username });
  const personalList = useQuery(
    api.lists.getPersonalListForUser,
    targetUser?.id ? { userId: targetUser.id } : "skip",
  );
  const followedLists = useQuery(api.lists.getFollowedLists, {});
  const followListMutation = useMutation(api.lists.followList);
  const unfollowListMutation = useMutation(api.lists.unfollowList);

  const { results: events } = useStablePaginatedQuery(
    api.feeds.getPublicUserFeed,
    { username, filter: "upcoming" as const },
    { initialNumItems: 10 },
  );

  const { imageUris, upcomingCount } = useMemo((): {
    imageUris: (string | null)[];
    upcomingCount: number;
  } => {
    const currentTime = new Date(stableTimestamp).getTime();
    const upcoming = events.filter(
      (e) => new Date(e.endDateTime).getTime() >= currentTime,
    );
    const urls: string[] = [];
    for (const e of upcoming) {
      if (typeof e.image === "string" && e.image.length > 0) {
        urls.push(e.image);
        if (urls.length >= 3) break;
      }
    }
    return {
      imageUris: [urls[0] ?? null, urls[1] ?? null, urls[2] ?? null],
      upcomingCount: upcoming.length,
    };
  }, [events, stableTimestamp]);

  const isSelf =
    currentUserId !== undefined &&
    targetUser?.id !== undefined &&
    targetUser.id === currentUserId;

  const isFollowing = useMemo(() => {
    if (!personalList || !followedLists) return false;
    return followedLists.some((l) => l.id === personalList.id);
  }, [personalList, followedLists]);

  const [isUpdatingFollow, setIsUpdatingFollow] = useState(false);

  const handleToggleFollow = useCallback(async () => {
    if (!personalList || isSelf || isUpdatingFollow) return;
    setIsUpdatingFollow(true);
    void Haptics.selectionAsync();
    try {
      if (isFollowing) {
        await unfollowListMutation({ listId: personalList.id });
      } else {
        await followListMutation({ listId: personalList.id });
      }
    } catch (error) {
      logError("Error toggling list follow from empty state", error);
    } finally {
      setIsUpdatingFollow(false);
    }
  }, [
    personalList,
    isSelf,
    isUpdatingFollow,
    isFollowing,
    unfollowListMutation,
    followListMutation,
  ]);

  const upcomingLabel =
    upcomingCount === 1
      ? "1 upcoming event"
      : `${upcomingCount} upcoming events`;

  return (
    <View className="mb-4 flex-row items-center gap-3">
      <TouchableOpacity
        onPress={() => router.push(`/${username}`)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Open ${displayName}'s profile`}
        className="min-w-0 flex-1 flex-row items-center gap-3"
      >
        <ScenePreviewThreeUp imageUris={imageUris} align="start" />
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-1.5">
            {targetUser?.userImage ? (
              <Image
                source={{ uri: targetUser.userImage }}
                style={{ width: 20, height: 20, borderRadius: 10 }}
                contentFit="cover"
                cachePolicy="disk"
              />
            ) : (
              <View className="h-5 w-5 items-center justify-center rounded-full bg-neutral-4">
                <User size={12} color="#627496" />
              </View>
            )}
            <Text
              className="flex-1 text-base font-semibold text-neutral-1"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {displayName}
            </Text>
          </View>
          <Text
            className="text-sm text-neutral-2"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {upcomingLabel}
          </Text>
        </View>
      </TouchableOpacity>
      {!isSelf ? (
        <TouchableOpacity
          onPress={() => void handleToggleFollow()}
          disabled={!personalList || isUpdatingFollow}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={
            isFollowing ? `Unfollow ${displayName}` : `Follow ${displayName}`
          }
          className={`rounded-full px-4 py-2 ${
            isFollowing ? "bg-neutral-4" : "bg-interactive-1"
          } ${!personalList || isUpdatingFollow ? "opacity-60" : ""}`}
        >
          <Text
            className={`text-sm font-semibold ${
              isFollowing ? "text-neutral-1" : "text-white"
            }`}
          >
            {isFollowing ? "Following" : "Follow"}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function FollowingEmptyState({
  hasFollowings,
  followedEventCount,
  onExitToFeed,
}: {
  hasFollowings: boolean;
  followedEventCount: number;
  onExitToFeed: () => void;
}) {
  const { user } = useUser();

  const userData = useQuery(
    api.users.getByUsername,
    user?.username ? { userName: user.username } : "skip",
  );
  const currentUserId = userData?.id;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ flex: 1, backgroundColor: "#F4F1FF" }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: 80,
      }}
    >
      <View className="px-3 pb-2" style={{ marginTop: -4 }}>
        <Text
          className="mb-1 text-base font-medium text-neutral-2"
          style={{ paddingLeft: 6 }}
        >
          Events from lists I follow
        </Text>
      </View>

      <View className="px-6 pt-6">
        <Text
          className="mb-3 text-2xl font-bold text-neutral-1"
          style={{ lineHeight: 30 }}
        >
          Follow a list to get started
        </Text>
        <Text
          className="mb-6 text-base text-neutral-2"
          style={{ lineHeight: 22 }}
        >
          My Scene shows upcoming events from people you follow. Start with
          one of these featured lists.
        </Text>

        <View className="mb-2">
          {FEATURED_LISTS.map((list) => (
            <FeaturedListRow
              key={list.username}
              username={list.username}
              displayName={list.displayName}
              currentUserId={currentUserId}
            />
          ))}
        </View>

        {hasFollowings ? (
          <View className="mt-4 items-center">
            <Text className="mb-1 text-sm text-neutral-2">
              {followedEventCount === 1
                ? "1 event added to My Scene"
                : `${followedEventCount} events added to My Scene`}
            </Text>
            <TouchableOpacity
              onPress={onExitToFeed}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="View My Scene"
              className="px-2 py-2"
            >
              <Text className="text-base font-semibold text-interactive-1">
                View My Scene →
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function FollowingFeedContent() {
  const { user } = useUser();
  const [selectedSegment, setSelectedSegment] = useState<Segment>("upcoming");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const stableTimestamp = useStableTimestamp();

  // Check if user is following any lists
  const followedLists = useQuery(api.lists.getFollowedLists);
  const hasFollowings = (followedLists?.length ?? 0) > 0;

  // Session-sticky empty state: once the user lands with no followings, keep the empty
  // state visible so they can follow multiple featured lists without it disappearing
  // after the first follow. They exit explicitly via "See your scene" or on next tab
  // remount (when hasFollowings is already true on load).
  const [emptyStateMode, setEmptyStateMode] = useState<
    "unset" | "show" | "dismissed"
  >("unset");
  useEffect(() => {
    if (followedLists === undefined) return;
    if (!hasFollowings && emptyStateMode !== "show") {
      setEmptyStateMode("show");
    }
  }, [followedLists, hasFollowings, emptyStateMode]);
  const handleExitEmptyState = useCallback(() => {
    setEmptyStateMode("dismissed");
  }, []);

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
    api.feeds.getFollowedListsFeed,
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
          Events from lists I follow
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
    handleShareList,
  ]);

  // Show empty state if this session started empty and the user hasn't exited yet.
  if (emptyStateMode === "show") {
    return (
      <FollowingEmptyState
        hasFollowings={hasFollowings}
        followedEventCount={enrichedEvents.length}
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
        isLoadingFirstPage={followedLists === undefined}
        showCreator="always"
        primaryAction="save"
        showSourceStickers
        savedEventIds={savedEventIds}
        source="following"
        HeaderComponent={HeaderComponent}
      />
    </>
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
