import React, { useCallback, useMemo } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";

import type { Doc } from "@soonlist/backend/convex/_generated/dataModel";
import { api } from "@soonlist/backend/convex/_generated/api";

import { Check, User } from "~/components/icons";
import SaveShareButton from "~/components/SaveShareButton";
import UserEventsList from "~/components/UserEventsList";
import { UserProfileFlair } from "~/components/UserProfileFlair";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useStableTimestamp } from "~/store";
import { logError } from "~/utils/errorLogging";
import { hapticSuccess, toast } from "~/utils/feedback";

export default function UserProfilePage() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const stableTimestamp = useStableTimestamp();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();

  // Fetch user data by username
  const targetUser = useQuery(
    api.users.getByUsername,
    username ? { userName: username } : "skip",
  );

  // Get current user to check if viewing own profile
  const currentUser = useQuery(api.users.getCurrentUser);

  // Get user's public lists
  const userLists = useQuery(
    api.lists.getListsForUser,
    targetUser?.id ? { userId: targetUser.id } : "skip",
  );

  // Follow/unfollow list mutations
  const followListMutation = useMutation(api.lists.followList);
  const unfollowListMutation = useMutation(api.lists.unfollowList);

  // Query to get current user's saved event IDs
  const savedEventIdsQuery = useQuery(
    api.events.getSavedIdsForUser,
    isAuthenticated && currentUser?.username
      ? { userName: currentUser.username }
      : "skip",
  );

  const savedEventIds = new Set(
    savedEventIdsQuery?.map((event) => event.id) ?? [],
  );

  // Fetch user's public feed (uses visibility index for proper pagination)
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

  // Client-side safety filter: hide events that have ended
  // This prevents showing ended events if the cron job hasn't run recently
  const filteredEvents = useMemo(() => {
    const currentTime = new Date(stableTimestamp).getTime();
    return events.filter((event) => {
      const eventEndTime = new Date(event.endDateTime).getTime();
      return eventEndTime >= currentTime;
    });
  }, [events, stableTimestamp]);

  const handleLoadMore = () => {
    if (status === "CanLoadMore") {
      loadMore(25);
    }
  };

  // Get followed list IDs for the current user
  const followedLists = useQuery(api.lists.getFollowedLists);
  const followedListIds = new Set(
    followedLists?.map((l: Doc<"lists">) => l.id) ?? [],
  );

  const handleListFollow = useCallback(
    async (listId: string, currentlyFollowing: boolean) => {
      if (!isAuthenticated) {
        router.push("/(auth)/sign-in");
        return;
      }

      try {
        if (currentlyFollowing) {
          await unfollowListMutation({ listId });
        } else {
          await followListMutation({ listId });
        }
        void hapticSuccess();
      } catch (error) {
        logError("Error following/unfollowing list", error);
        toast.error(
          currentlyFollowing ? "Failed to unfollow" : "Failed to follow",
        );
      }
    },
    [isAuthenticated, followListMutation, unfollowListMutation, router],
  );

  // targetUser is undefined while loading, null if not found
  const isUserLoading = targetUser === undefined;
  const userNotFound = targetUser === null;
  const isOwnProfile = currentUser?.id === targetUser?.id;

  // Show loading state while user data is being fetched
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

  // Show not found state if user doesn't exist
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

  function ProfileSaveShareButtonWrapper({
    event,
  }: {
    event: { id: string; userId: string };
  }) {
    if (!isAuthenticated || !currentUser) {
      return null;
    }
    const isOwnEvent = event.userId === currentUser.id;
    const isSaved = savedEventIds.has(event.id);
    return (
      <SaveShareButton
        eventId={event.id}
        isSaved={isSaved}
        isOwnEvent={isOwnEvent}
        source="user_profile"
      />
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Public List",
          headerTransparent: true,
          headerTintColor: "#5A32FB", // interactive-1
          headerTitleStyle: {
            color: "#5A32FB", // interactive-1
          },
          headerRight: () => null,
        }}
      />
      <View className="flex-1 bg-interactive-3">
        <UserEventsList
          events={filteredEvents}
          onEndReached={handleLoadMore}
          isFetchingNextPage={status === "LoadingMore"}
          isLoadingFirstPage={status === "LoadingFirstPage"}
          showCreator="never"
          isDiscoverFeed={false}
          primaryAction={isOwnProfile ? "addToCalendar" : "save"}
          ActionButton={ProfileSaveShareButtonWrapper}
          savedEventIds={savedEventIds}
          HeaderComponent={() => (
            <>
              <UserProfileHeader
                user={targetUser}
                eventCount={filteredEvents.length}
              />
              {!isOwnProfile && userLists && userLists.length > 0 && (
                <View className="px-4 pb-4">
                  {userLists.map(
                    (list: Doc<"lists"> & { followerCount: number }) => {
                      const isFollowingList = followedListIds.has(list.id);
                      return (
                        <View
                          key={list.id}
                          className="mb-2 flex-row items-center justify-between rounded-xl bg-white p-3"
                        >
                          <View className="flex-1">
                            <Text
                              className="text-base font-semibold text-neutral-1"
                              numberOfLines={1}
                            >
                              {list.name}
                            </Text>
                            <Text className="text-xs text-neutral-2">
                              {list.followerCount}{" "}
                              {list.followerCount === 1
                                ? "follower"
                                : "followers"}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() =>
                              void handleListFollow(list.id, isFollowingList)
                            }
                            activeOpacity={0.7}
                          >
                            <View
                              className={`flex-row items-center rounded-full px-4 py-2 ${
                                isFollowingList
                                  ? "bg-neutral-4"
                                  : "bg-interactive-1"
                              }`}
                            >
                              {isFollowingList && (
                                <Check
                                  size={16}
                                  color="#627496"
                                  strokeWidth={3}
                                />
                              )}
                              <Text
                                className={`ml-1 text-sm font-semibold ${
                                  isFollowingList
                                    ? "text-neutral-2"
                                    : "text-white"
                                }`}
                              >
                                {isFollowingList ? "Following" : "Follow"}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                      );
                    },
                  )}
                </View>
              )}
            </>
          )}
        />
      </View>
    </>
  );
}

interface UserProfileHeaderProps {
  user:
    | {
        id: string;
        username: string;
        displayName?: string | null;
        userImage?: string | null;
        bio?: string | null;
      }
    | null
    | undefined;
  eventCount: number;
}

function UserProfileHeader({ user, eventCount }: UserProfileHeaderProps) {
  if (!user) return null;

  return (
    <View className="items-center px-4 pb-2">
      {/* Avatar */}
      <UserProfileFlair username={user.username} size="xl">
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

      {/* Name */}
      <Text className="mt-2 text-xl font-bold text-neutral-1">
        {user.displayName || user.username}
      </Text>

      {/* Bio */}
      {user.bio && (
        <Text className="mt-1 text-center text-sm text-neutral-2">
          {user.bio}
        </Text>
      )}

      {/* Event count */}
      <Text className="mt-1 text-sm text-neutral-2">
        {eventCount} upcoming {eventCount === 1 ? "event" : "events"}
      </Text>
    </View>
  );
}

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";
