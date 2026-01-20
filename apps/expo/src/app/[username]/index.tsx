import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { toast } from "sonner-native";

import { api } from "@soonlist/backend/convex/_generated/api";

import { Check, User } from "~/components/icons";
import { LiquidGlassHeader } from "~/components/LiquidGlassHeader";
import UserEventsList from "~/components/UserEventsList";
import { UserProfileFlair } from "~/components/UserProfileFlair";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useStableTimestamp } from "~/store";
import { logError } from "~/utils/errorLogging";

export default function UserProfilePage() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const stableTimestamp = useStableTimestamp();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // Fetch user data by username
  const targetUser = useQuery(
    api.users.getByUsername,
    username ? { userName: username } : "skip",
  );

  // Get current user to check if viewing own profile
  const currentUser = useQuery(api.users.getCurrentUser);

  // Check if current user is following the target user
  const isFollowing = useQuery(
    api.users.isFollowingUser,
    targetUser?.id ? { followingId: targetUser.id } : "skip",
  );

  // Follow/unfollow mutations
  const followUserMutation = useMutation(api.users.followUser);
  const unfollowUserMutation = useMutation(api.users.unfollowUser);

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

  // Events are already filtered by visibility at the database level
  // No client-side filtering needed
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

  const handleFollow = useCallback(async () => {
    if (!targetUser?.id) return;

    // If not authenticated, redirect to sign-in
    if (!isAuthenticated) {
      router.push("/(auth)/sign-in");
      return;
    }

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUserMutation({ followingId: targetUser.id });
        toast.success("Unfollowed list");
      } else {
        await followUserMutation({ followingId: targetUser.id });
        toast.success("Followed list");
      }
    } catch (error) {
      logError("Error following/unfollowing user", error);
      toast.error(isFollowing ? "Failed to unfollow" : "Failed to follow");
    } finally {
      setIsFollowLoading(false);
    }
  }, [
    targetUser,
    isAuthenticated,
    isFollowing,
    followUserMutation,
    unfollowUserMutation,
    router,
  ]);

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
            headerBackground: () => <LiquidGlassHeader />,
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
            headerBackground: () => <LiquidGlassHeader />,
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
          title: "Public List",
          headerTransparent: true,
          headerBackground: () => (
            <View
              style={{
                flex: 1,
                backgroundColor: "#E0D9FF", // interactive-2
              }}
            />
          ),
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
          hideDiscoverableButton={true}
          isDiscoverFeed={false}
          HeaderComponent={() => (
            <UserProfileHeader
              user={targetUser}
              eventCount={filteredEvents.length}
            />
          )}
        />
        {/* Don't show follow button on own profile */}
        {!isOwnProfile && (
          <FollowButton
            isFollowing={isFollowing ?? false}
            isLoading={isFollowLoading || isFollowing === undefined}
            onPress={handleFollow}
          />
        )}
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

function FollowButton({
  isFollowing,
  isLoading,
  onPress,
}: {
  isFollowing: boolean;
  isLoading: boolean;
  onPress: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="absolute bottom-0 flex-row items-center justify-center self-center"
      style={{
        paddingBottom: insets.bottom + 16,
        shadowColor: "#5A32FB",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        disabled={isLoading}
        accessibilityLabel={isFollowing ? "Unfollow" : "Get Updates"}
        accessibilityRole="button"
        activeOpacity={0.8}
      >
        <View
          className={`flex-row items-center rounded-full px-8 py-5 ${
            isFollowing
              ? "gap-3 bg-neutral-2"
              : isLoading
                ? "gap-3 bg-interactive-1"
                : "bg-interactive-1"
          }`}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : isFollowing ? (
            <Check size={24} color="#FFFFFF" strokeWidth={3} />
          ) : null}
          <Text className="text-xl font-bold text-white">
            {isLoading
              ? "Loading..."
              : isFollowing
                ? "Following"
                : "Get Updates"}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";
