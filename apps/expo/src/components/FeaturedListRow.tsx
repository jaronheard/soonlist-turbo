import React, { useCallback, useMemo, useRef } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import { api } from "@soonlist/backend/convex/_generated/api";

import { User } from "~/components/icons";
import ScenePreviewThreeUp from "~/components/ScenePreviewThreeUp";
import { SubscribeButton } from "~/components/SubscribeButton";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useStableTimestamp } from "~/store";
import { logError } from "~/utils/errorLogging";
import { hapticSuccess } from "~/utils/feedback";

interface FeaturedListRowProps {
  username: string;
  displayName: string;
  currentUserId: string | undefined;
  followedLists: Doc<"lists">[] | undefined;
}

export function FeaturedListRow({
  username,
  displayName,
  currentUserId,
  followedLists,
}: FeaturedListRowProps) {
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
    if (!personalList || isSelf || isMutatingRef.current) return;
    isMutatingRef.current = true;
    const wasSubscribed = isSubscribed;
    const promise = wasSubscribed
      ? unfollowListMutation({ listId: personalList.id })
      : followListMutation({ listId: personalList.id });
    promise
      .then(() => {
        if (!wasSubscribed) {
          void hapticSuccess();
        }
      })
      .catch((error) => {
        logError(
          wasSubscribed
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
      {!isSelf && personalList ? (
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
