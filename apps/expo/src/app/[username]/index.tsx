import React, { useCallback, useMemo } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import { api } from "@soonlist/backend/convex/_generated/api";

import { User } from "~/components/icons";
import { SubscribeButton } from "~/components/SubscribeButton";
import UserEventsList from "~/components/UserEventsList";
import { UserProfileFlair } from "~/components/UserProfileFlair";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import {
  useLoadMoreHandler,
  useUpcomingEventsFilter,
} from "~/hooks/useUpcomingFeed";
import { logError } from "~/utils/errorLogging";
import { toast } from "~/utils/feedback";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function profileLocationFromUser(user: {
  publicMetadata?: unknown;
}): string | null {
  const meta = user.publicMetadata;
  if (!isRecord(meta)) return null;
  for (const key of ["location", "city", "hometown"] as const) {
    const v = meta[key];
    if (typeof v === "string" && v.trim().length > 0) {
      return v.trim();
    }
  }
  return null;
}

export default function UserProfilePage() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();

  const targetUser = useQuery(
    api.users.getByUsername,
    username ? { userName: username } : "skip",
  );

  const currentUser = useQuery(api.users.getCurrentUser);

  const personalList = useQuery(
    api.lists.getPersonalListForUser,
    targetUser?.id ? { userId: targetUser.id } : "skip",
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

  const savedEventIdsQuery = useQuery(
    api.events.getSavedIdsForUser,
    isAuthenticated && currentUser?.username
      ? { userName: currentUser.username }
      : "skip",
  );

  const savedEventIds = new Set(
    savedEventIdsQuery?.map((event) => event.id) ?? [],
  );

  const {
    results: events,
    status,
    loadMore,
  } = useStablePaginatedQuery(
    api.feeds.getPublicUserFeed,
    username
      ? {
          username: username,
          filter: "upcoming" as const,
        }
      : "skip",
    { initialNumItems: 50 },
  );

  const filteredEvents = useUpcomingEventsFilter(events);

  const handleLoadMore = useLoadMoreHandler(status, loadMore);

  const followedLists = useQuery(
    api.lists.getFollowedLists,
    isAuthenticated ? {} : "skip",
  );
  const followingIds = useMemo(
    () => new Set(followedLists?.map((l: Doc<"lists">) => l.id) ?? []),
    [followedLists],
  );

  const isUserLoading = targetUser === undefined;
  const userNotFound = targetUser === null;
  const isOwnProfile = currentUser?.id === targetUser?.id;

  const screenTitle =
    targetUser?.displayName || targetUser?.username || "Profile";

  const isFollowingPersonalList = personalList
    ? followingIds.has(personalList.id)
    : false;

  const handleFollowListPress = useCallback(() => {
    if (!personalList) return;
    if (!isAuthenticated) {
      router.push("/(auth)/sign-in");
      return;
    }
    const run = isFollowingPersonalList
      ? unfollowListMutation
      : followListMutation;
    run({ listId: personalList.id }).catch((error: unknown) => {
      logError("Toggle follow personal list", error);
      toast.error("Couldn't update subscription");
    });
  }, [
    personalList,
    isAuthenticated,
    isFollowingPersonalList,
    followListMutation,
    unfollowListMutation,
    router,
  ]);

  const listHeader = useMemo(() => {
    if (!targetUser) {
      return <></>;
    }
    const upcomingCount = filteredEvents.length;

    return (
      <ProfileIdentityHeader
        user={targetUser}
        upcomingEventCount={upcomingCount}
      />
    );
  }, [targetUser, filteredEvents.length]);

  const renderListHeader = useCallback(() => listHeader, [listHeader]);

  if (isUserLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerTransparent: true,
            headerBackground: undefined,
            headerRight: () => null,
          }}
        />
        <View className="flex-1 items-center justify-center bg-interactive-3">
          <ActivityIndicator size="large" color="#5A32FB" />
        </View>
      </>
    );
  }

  if (userNotFound) {
    return (
      <>
        <Stack.Screen
          options={{
            headerTransparent: true,
            headerBackground: undefined,
            headerRight: () => null,
          }}
        />
        <View className="flex-1 items-center justify-center bg-white">
          <Text className="text-lg text-neutral-2">User not found</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: screenTitle,
          headerLargeTitle: false,
          headerTransparent: true,
          headerBlurEffect: "none",
          headerShadowVisible: false,
          headerTintColor: "#5A32FB",
          headerTitleStyle: {
            color: "#5A32FB",
          },
          unstable_headerRightItems:
            isOwnProfile || !personalList
              ? undefined
              : () => [
                  {
                    type: "custom",
                    element: (
                      <SubscribeButton
                        isSubscribed={isFollowingPersonalList}
                        onPress={handleFollowListPress}
                      />
                    ),
                    hidesSharedBackground: true,
                  },
                ],
        }}
      />
      <View className="flex-1 bg-interactive-3">
        <UserEventsList
          events={filteredEvents}
          onEndReached={handleLoadMore}
          isFetchingNextPage={status === "LoadingMore"}
          listBodyLoading={status === "LoadingFirstPage"}
          showCreator="never"
          primaryAction={isOwnProfile ? "addToCalendar" : "save"}
          savedEventIds={savedEventIds}
          source="user_profile"
          HeaderComponent={renderListHeader}
        />
      </View>
    </>
  );
}

interface ProfileIdentityHeaderProps {
  user: {
    id: string;
    username: string;
    displayName?: string | null;
    userImage?: string | null;
    publicMetadata?: unknown;
  };
  upcomingEventCount: number;
}

/** Profile header: avatar stacked above identity text block. */
function ProfileIdentityHeader({
  user,
  upcomingEventCount,
}: ProfileIdentityHeaderProps) {
  const locationLine = profileLocationFromUser(user);

  return (
    <View className="items-start gap-3 px-4 pb-4 pt-2">
      <UserProfileFlair username={user.username} size="lg">
        {user.userImage ? (
          <Image
            source={{ uri: user.userImage }}
            style={{ width: 80, height: 80, borderRadius: 40 }}
            contentFit="cover"
            cachePolicy="disk"
          />
        ) : (
          <View className="h-20 w-20 items-center justify-center rounded-full bg-neutral-4">
            <User size={40} color="#627496" />
          </View>
        )}
      </UserProfileFlair>
      <View className="w-full">
        <Text className="text-xl font-bold text-neutral-1">
          @{user.username}
        </Text>
        <Text className="text-sm text-neutral-2">
          {upcomingEventCount}{" "}
          {upcomingEventCount === 1 ? "upcoming event" : "upcoming events"}
        </Text>
        {locationLine ? (
          <Text className="text-sm text-neutral-2" numberOfLines={1}>
            {locationLine}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export { ErrorBoundary } from "expo-router";
