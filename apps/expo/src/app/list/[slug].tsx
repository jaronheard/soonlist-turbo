import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { List as ListIcon, ShareIcon } from "~/components/icons";
import { SubscribeButton } from "~/components/SubscribeButton";
import UserEventsList from "~/components/UserEventsList";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { logError } from "~/utils/errorLogging";
import { toast } from "~/utils/feedback";

export default function ListDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const normalizedSlug = typeof slug === "string" ? slug : "";
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser);

  const listResult = useQuery(
    api.lists.getBySlug,
    normalizedSlug ? { slug: normalizedSlug } : "skip",
  );
  const listData = listResult?.status === "ok" ? listResult.list : null;
  const {
    results: listEvents,
    status,
    loadMore,
  } = useStablePaginatedQuery(
    api.lists.getEventsForList,
    normalizedSlug ? { slug: normalizedSlug } : "skip",
    { initialNumItems: 50 },
  );

  const followListMutation = useMutation(
    api.lists.followList,
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.lists.getFollowedLists, {});
    if (current === undefined || !listData) return;
    if (current.some((l) => l.id === args.listId)) return;
    localStore.setQuery(api.lists.getFollowedLists, {}, [...current, listData]);
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

  const handleLoadMore = useCallback(() => {
    if (status === "CanLoadMore") {
      loadMore(25);
    }
  }, [status, loadMore]);

  const ListHeader = useCallback(
    () => (
      <View className="flex-row items-start gap-4 px-4 pb-2">
        <View className="h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-interactive-2">
          <ListIcon size={24} color="#5A32FB" />
        </View>
        <View className="min-w-0 flex-1 justify-center pt-0.5">
          <Text className="text-lg font-bold text-neutral-1" numberOfLines={2}>
            {listData?.name}
          </Text>
          {listData?.owner ? (
            <Text className="mt-0.5 text-sm text-neutral-2" numberOfLines={1}>
              by {listData.owner.displayName || listData.owner.username}
            </Text>
          ) : null}
        </View>
      </View>
    ),
    [listData?.name, listData?.owner],
  );

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

  const events = listEvents.map((event) => ({
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
          unstable_headerRightItems:
            isOwnList || !listData
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
      <UserEventsList
        groupedEvents={events}
        showCreator="always"
        onEndReached={handleLoadMore}
        isFetchingNextPage={status === "LoadingMore"}
        HeaderComponent={ListHeader}
      />

      {/* Floating Share button (primary action), matches event detail */}
      <View
        className="absolute bottom-8 flex-row items-center justify-center gap-4 self-center"
        style={{
          shadowColor: "#5A32FB",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 8,
        }}
      >
        <TouchableOpacity
          onPress={() => void handleShare()}
          accessibilityLabel="Share list"
          accessibilityRole="button"
          activeOpacity={0.8}
        >
          <View className="flex-row items-center gap-4 rounded-full bg-interactive-1 px-8 py-5">
            <ShareIcon size={28} color="#FFFFFF" />
            <Text className="text-xl font-bold text-white">Share</Text>
          </View>
        </TouchableOpacity>
      </View>
    </>
  );
}
