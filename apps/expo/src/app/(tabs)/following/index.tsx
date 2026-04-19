import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Platform,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import { api } from "@soonlist/backend/convex/_generated/api";

import { FollowedListsModal } from "~/components/FollowedListsModal";
import { User } from "~/components/icons";
import LoadingSpinner from "~/components/LoadingSpinner";
import ScenePreviewThreeUp from "~/components/ScenePreviewThreeUp";
import { SubscribeButton } from "~/components/SubscribeButton";
import UserEventsList from "~/components/UserEventsList";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useAppStore, useStableTimestamp } from "~/store";
import { logError } from "~/utils/errorLogging";
import { toast } from "~/utils/feedback";

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
  followedLists,
}: {
  username: string;
  displayName: string;
  currentUserId: string | undefined;
  followedLists: Doc<"lists">[] | undefined;
}) {
  const router = useRouter();
  const stableTimestamp = useStableTimestamp();

  const targetUser = useQuery(api.users.getByUsername, { userName: username });
  const targetUserFound = targetUser !== null && targetUser !== undefined;
  const personalList = useQuery(
    api.lists.getPersonalListForUser,
    targetUserFound ? { userId: targetUser.id } : "skip",
  );

  const followListMutation = useMutation(
    api.lists.followList,
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.lists.getFollowedLists, {});
    if (current === undefined || !personalList) return;
    if (current.some((l) => l.id === args.listId)) return;
    localStore.setQuery(api.lists.getFollowedLists, {}, [
      ...current,
      personalList,
    ]);
  });

  // Fallback for targets whose personal list doesn't exist yet; the server
  // creates it on demand.
  const followUserByUsernameMutation = useMutation(
    api.lists.followUserByUsername,
  );

  const unfollowListMutation = useMutation(
    api.lists.unfollowList,
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.lists.getFollowedLists, {});
    if (current === undefined) return;
    localStore.setQuery(
      api.lists.getFollowedLists,
      {},
      current.filter((l) => l.id !== args.listId),
    );
  });

  const { results: events, status: feedStatus } = useStablePaginatedQuery(
    api.feeds.getPublicUserFeed,
    targetUserFound ? { username, filter: "upcoming" as const } : "skip",
    { initialNumItems: 50 },
  );

  const { imageUris, upcomingCount, hasMoreUpcoming } = useMemo((): {
    imageUris: (string | null)[];
    upcomingCount: number;
    hasMoreUpcoming: boolean;
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
      hasMoreUpcoming: feedStatus === "CanLoadMore",
    };
  }, [events, stableTimestamp, feedStatus]);

  const isSelf =
    currentUserId !== undefined &&
    targetUser?.id !== undefined &&
    targetUser.id === currentUserId;

  const isSubscribed = useMemo(() => {
    if (!personalList || !followedLists) return false;
    return followedLists.some((l) => l.id === personalList.id);
  }, [personalList, followedLists]);

  const isMutatingRef = useRef(false);

  const handleToggleSubscribe = useCallback(() => {
    if (isSelf || isMutatingRef.current) return;
    // personalList === undefined means the Convex query is still loading;
    // ignore the tap so we don't drop the optimistic-update path for users
    // whose list just hasn't resolved yet.
    const promise =
      isSubscribed && personalList
        ? unfollowListMutation({ listId: personalList.id })
        : personalList
          ? followListMutation({ listId: personalList.id })
          : personalList === null
            ? followUserByUsernameMutation({ username })
            : null;
    if (!promise) return;
    isMutatingRef.current = true;
    promise
      .then((result) => {
        // followUserByUsername returns { success, reason } without throwing;
        // surface that as an error so the user gets feedback. follow/unfollow
        // both always return { success: true }.
        if (result && "reason" in result && !result.success) {
          logError("followUserByUsername returned failure", {
            reason: result.reason,
          });
          toast.error("Couldn't update subscription");
        }
      })
      .catch((error) => {
        logError(
          isSubscribed
            ? "Error unsubscribing from featured list"
            : "Error subscribing to featured list",
          error,
        );
      })
      .finally(() => {
        isMutatingRef.current = false;
      });
  }, [
    personalList,
    isSelf,
    isSubscribed,
    unfollowListMutation,
    followListMutation,
    followUserByUsernameMutation,
    username,
  ]);

  const upcomingLabel =
    upcomingCount === 1
      ? "1 upcoming event"
      : `${upcomingCount}${hasMoreUpcoming ? "+" : ""} upcoming events`;

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
      {!isSelf && targetUserFound ? (
        <SubscribeButton
          isSubscribed={isSubscribed}
          onPress={handleToggleSubscribe}
          size="sm"
          accessibilityLabel={
            isSubscribed
              ? `Unsubscribe from ${displayName}`
              : `Subscribe to ${displayName}`
          }
        />
      ) : null}
    </View>
  );
}

function FollowingEmptyState({
  hasFollowings,
  followedEventCount,
  hasMoreFollowedEvents,
  followedLists,
  onExitToFeed,
}: {
  hasFollowings: boolean;
  followedEventCount: number;
  hasMoreFollowedEvents: boolean;
  followedLists: Doc<"lists">[] | undefined;
  onExitToFeed: () => void;
}) {
  const { user } = useUser();

  const userData = useQuery(
    api.users.getByUsername,
    user?.username ? { userName: user.username } : "skip",
  );
  const currentUserId = userData?.id;

  const featuredLists = useQuery(api.appConfig.getFeaturedLists, {}) ?? [];

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
          Events from lists I subscribe to
        </Text>
      </View>

      <View className="px-6 pt-6">
        <Text
          className="mb-3 text-2xl font-bold text-neutral-1"
          style={{ lineHeight: 30 }}
        >
          Subscribe to a list to get started
        </Text>
        <Text
          className="mb-6 text-base text-neutral-2"
          style={{ lineHeight: 22 }}
        >
          My Scene shows upcoming events from people you subscribe to.
          {featuredLists.length > 0
            ? " Start with one of these featured lists."
            : ""}
        </Text>

        {featuredLists.length > 0 ? (
          <View className="mb-2">
            {featuredLists.map((list) => (
              <FeaturedListRow
                key={list.username}
                username={list.username}
                displayName={list.displayName}
                currentUserId={currentUserId}
                followedLists={followedLists}
              />
            ))}
          </View>
        ) : null}

        {hasFollowings ? (
          <View className="mt-4 items-center">
            <Text className="mb-1 text-sm text-neutral-2">
              {followedEventCount === 1
                ? "1 event added to My Scene"
                : `${followedEventCount}${
                    hasMoreFollowedEvents ? "+" : ""
                  } events added to My Scene`}
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

  // Sticky so users can subscribe to multiple featured lists without the
  // screen flipping to the feed mid-flow. Re-latches to "show" after an
  // unfollow-all so the feed isn't stuck on stale paginated results.
  const [emptyStateMode, setEmptyStateMode] = useState<
    "unset" | "show" | "dismissed"
  >("unset");
  useEffect(() => {
    if (followedLists === undefined) return;
    if (emptyStateMode === "unset") {
      setEmptyStateMode(hasFollowings ? "dismissed" : "show");
      return;
    }
    if (emptyStateMode === "dismissed" && !hasFollowings) {
      setEmptyStateMode("show");
      // Reset to the default segment so the onboarding confirmation count and
      // the subsequent feed view both reflect upcoming events, not whatever
      // segment the user had picked under their prior subscriptions.
      setSelectedSegment("upcoming");
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
          Events from lists I subscribe to
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

  // Second branch avoids a one-frame flash before the latch effect commits.
  const showEmptyState =
    emptyStateMode === "show" ||
    (followedLists !== undefined && !hasFollowings);
  if (showEmptyState) {
    return (
      <FollowingEmptyState
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
        isLoadingFirstPage={followedLists === undefined}
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
