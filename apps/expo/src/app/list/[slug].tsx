import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Share, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import type { SoonlistHeroSegment } from "~/components/SoonlistHero";
import { FloatingShareButton } from "~/components/FloatingShareButton";
import { AttributionGrid } from "~/components/AttributionGrid";
import { SoonlistHero } from "~/components/SoonlistHero";
import { SubscribeButton } from "~/components/SubscribeButton";
import UserEventsList from "~/components/UserEventsList";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import {
  useLoadMoreHandler,
  useUpcomingEventsFilter,
} from "~/hooks/useUpcomingFeed";
import { useStableTimestamp } from "~/store";
import { logError } from "~/utils/errorLogging";
import { toast } from "~/utils/feedback";
import { eventMatchesFeedSegment } from "~/utils/feedSegment";

export default function ListDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const normalizedSlug = typeof slug === "string" ? slug : "";
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser);
  const [selectedSegment, setSelectedSegment] =
    useState<SoonlistHeroSegment>("upcoming");
  const stableTimestamp = useStableTimestamp();

  const listResult = useQuery(
    api.lists.getBySlug,
    normalizedSlug ? { slug: normalizedSlug } : "skip",
  );
  const listData = listResult?.status === "ok" ? listResult.list : null;

  const lastUpdatedAt = useQuery(
    api.feeds.getPublicListFeedLastUpdated,
    normalizedSlug ? { slug: normalizedSlug } : "skip",
  );

  const contributors = useQuery(
    api.lists.getContributorsForList,
    normalizedSlug ? { slug: normalizedSlug } : "skip",
  );

  const feedQueryArgs = useMemo(
    () =>
      normalizedSlug
        ? { slug: normalizedSlug, filter: selectedSegment }
        : "skip",
    [normalizedSlug, selectedSegment],
  );

  const {
    results: listEvents,
    status,
    loadMore,
  } = useStablePaginatedQuery(api.lists.getEventsForList, feedQueryArgs, {
    initialNumItems: 50,
  });

  // Upcoming uses the freshness-filter helper for parity with the profile
  // screen; past just trusts the server filter and the segment guard below.
  const upcomingEventsFiltered = useUpcomingEventsFilter(
    selectedSegment === "upcoming" ? listEvents : [],
  );

  const displayEvents = useMemo(() => {
    if (selectedSegment === "upcoming") {
      return upcomingEventsFiltered;
    }
    const stableMs = new Date(stableTimestamp).getTime();
    return listEvents.filter((e) =>
      eventMatchesFeedSegment(e.endDateTime, "past", stableMs),
    );
  }, [selectedSegment, listEvents, upcomingEventsFiltered, stableTimestamp]);

  const followListMutation = useMutation(
    api.lists.followList,
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.lists.getFollowedLists, {});
    if (current === undefined || !listData) return;
    if (current.some((l) => l.id === args.listId)) return;
    // getBySlug returns an enriched shape; strip fields not on Doc<"lists">
    // before writing to the getFollowedLists cache.
    const {
      owner: _owner,
      contributorCount: _contributorCount,
      followerCount: _followerCount,
      ...rawList
    } = listData;
    localStore.setQuery(api.lists.getFollowedLists, {}, [...current, rawList]);
  });

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

  const followedLists = useQuery(
    api.lists.getFollowedLists,
    isAuthenticated ? {} : "skip",
  );

  const isFollowing = useMemo(
    () => followedLists?.some((l) => l.slug === normalizedSlug) ?? false,
    [followedLists, normalizedSlug],
  );

  const isOwnList = listData?.userId === currentUser?.id;

  const handleToggleFollow = useCallback(() => {
    if (!listData) return;
    if (!isAuthenticated) {
      router.push("/(auth)/sign-in");
      return;
    }
    const run = isFollowing ? unfollowListMutation : followListMutation;
    run({ listId: listData.id }).catch((error: unknown) => {
      logError("Error toggling list follow", error);
      toast.error(
        isFollowing ? "Failed to unsubscribe" : "Failed to subscribe",
      );
    });
  }, [
    listData,
    isAuthenticated,
    isFollowing,
    followListMutation,
    unfollowListMutation,
    router,
  ]);

  const handleShare = useCallback(async () => {
    if (!listData || !normalizedSlug) return;
    try {
      await Share.share({
        message: `Check out ${listData.name} on Soonlist`,
        url: `https://soonlist.com/list/${normalizedSlug}`,
      });
    } catch (error) {
      logError("Error sharing list", error);
    }
  }, [listData, normalizedSlug]);

  const handleLoadMore = useLoadMoreHandler(status, loadMore);

  const renderListHeader = useCallback(() => {
    if (!listData) return null;

    const ownerForDisplay = listData.owner
      ? {
          id: listData.owner.id,
          username: listData.owner.username,
          displayName: listData.owner.displayName,
          userImage: listData.owner.userImage,
        }
      : null;

    return (
      <SoonlistHero
        title={listData.name}
        subtitle={
          ownerForDisplay ? (
            <AttributionGrid
              creator={ownerForDisplay}
              savers={contributors ?? []}
              lists={[]}
              currentUserId={currentUser?.id}
              variant="compact"
              background="white"
              label="List contributors:"
              creatorBadgeLabel="owner"
            />
          ) : null
        }
        lastUpdatedAt={lastUpdatedAt}
        selectedSegment={selectedSegment}
        onSegmentChange={setSelectedSegment}
      />
    );
  }, [
    listData,
    lastUpdatedAt,
    selectedSegment,
    contributors,
    currentUser?.id,
  ]);

  if (
    !normalizedSlug ||
    listResult === undefined ||
    status === "LoadingFirstPage"
  ) {
    return (
      <>
        <Stack.Screen options={{ title: "List Details" }} />
        <View className="flex-1 items-center justify-center bg-interactive-3">
          <ActivityIndicator size="large" color="#5A32FB" />
        </View>
      </>
    );
  }

  if (listResult.status === "notFound") {
    return (
      <>
        <Stack.Screen options={{ title: "List Details" }} />
        <View className="flex-1 items-center justify-center bg-interactive-3">
          <Text className="text-base text-neutral-2">List not found</Text>
        </View>
      </>
    );
  }

  if (listResult.status === "private") {
    const ownerName =
      listResult.owner?.displayName ??
      listResult.owner?.username ??
      "the owner";
    return (
      <>
        <Stack.Screen options={{ title: "List Details" }} />
        <View className="flex-1 items-center justify-center gap-2 bg-interactive-3 px-6">
          <Text className="text-center text-lg font-semibold text-neutral-1">
            This list is private
          </Text>
          <Text className="text-center text-base text-neutral-2">
            Ask {ownerName} for access.
          </Text>
        </View>
      </>
    );
  }

  // listResult.status === "ok" — listData is non-null
  if (!listData) {
    return null;
  }

  const events = displayEvents.map((event) => ({
    event,
    similarEvents: [],
    similarityGroupId: event.id,
    similarEventsCount: 0,
  }));

  return (
    <>
      <Stack.Screen
        options={{
          title: "List Details",
          unstable_headerRightItems: isOwnList
            ? undefined
            : () => [
                {
                  type: "custom",
                  element: (
                    <SubscribeButton
                      isSubscribed={isFollowing}
                      onPress={handleToggleFollow}
                    />
                  ),
                  hidesSharedBackground: true,
                },
              ],
        }}
      />
      <View className="flex-1 bg-interactive-3">
        <UserEventsList
          groupedEvents={events}
          showCreator="always"
          onEndReached={handleLoadMore}
          isFetchingNextPage={status === "LoadingMore"}
          HeaderComponent={renderListHeader}
        />
        <FloatingShareButton
          onPress={() => void handleShare()}
          accessibilityLabel="Share list"
        />
      </View>
    </>
  );
}
