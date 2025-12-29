import React, { useMemo, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { Heart, User } from "~/components/icons";
import UserEventsList from "~/components/UserEventsList";
import { UserProfileFlair } from "~/components/UserProfileFlair";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useStableTimestamp } from "~/store";

export default function UserProfilePage() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const stableTimestamp = useStableTimestamp();
  const [isFollowing, setIsFollowing] = useState(false);

  // Fetch user data by username
  const targetUser = useQuery(
    api.users.getByUsername,
    username ? { userName: username } : "skip",
  );

  // Fetch user's public events
  const {
    results: events,
    status,
    loadMore,
  } = useStablePaginatedQuery(
    api.feeds.getUserCreatedEvents,
    targetUser
      ? {
          userId: targetUser.id,
          filter: "upcoming" as const,
        }
      : "skip",
    { initialNumItems: 50 },
  );

  // Filter events client-side as safety check (backend should handle this, but good fallback)
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

  const handleFollow = () => {
    const newFollowingState = !isFollowing;
    setIsFollowing(newFollowingState);
    console.log(
      `Follow button pressed. New state: ${newFollowingState ? "Following" : "Not following"}`,
    );
  };

  // targetUser is undefined while loading, null if not found
  const isUserLoading = targetUser === undefined;
  const userNotFound = targetUser === null;

  // Show loading state while user data is being fetched
  if (isUserLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: "",
            headerBackVisible: true,
            headerBackTitle: "Back",
            headerStyle: { backgroundColor: "#F4F1FF" },
            headerShadowVisible: false,
            headerTintColor: "#5A32FB",
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
            headerShown: true,
            headerTitle: "",
            headerBackVisible: true,
            headerBackTitle: "Back",
            headerStyle: { backgroundColor: "#F4F1FF" },
            headerShadowVisible: false,
            headerTintColor: "#5A32FB",
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
          headerShown: true,
          headerTitle: "",
          headerBackVisible: true,
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: "#F4F1FF" },
          headerShadowVisible: false,
          headerTintColor: "#5A32FB",
        }}
      />
      <View className="flex-1 bg-interactive-3">
        {status === "LoadingFirstPage" ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#5A32FB" />
          </View>
        ) : (
          <>
            <UserEventsList
              events={filteredEvents}
              onEndReached={handleLoadMore}
              isFetchingNextPage={status === "LoadingMore"}
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
            <FollowButton isFollowing={isFollowing} onPress={handleFollow} />
          </>
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
    <View className="mb-4 items-center px-4 py-6">
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
      <Text className="mt-3 text-xl font-bold text-neutral-1">
        {user.displayName || user.username}
      </Text>

      {/* Bio */}
      {user.bio && (
        <Text className="mt-2 text-center text-sm text-neutral-2">
          {user.bio}
        </Text>
      )}

      {/* Event count */}
      <View className="mt-4 flex-row items-center gap-2">
        <Text className="text-sm text-neutral-2">
          {eventCount} upcoming {eventCount === 1 ? "event" : "events"}
        </Text>
      </View>
    </View>
  );
}

function FollowButton({
  isFollowing,
  onPress,
}: {
  isFollowing: boolean;
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
        accessibilityLabel={isFollowing ? "Unfollow" : "Follow"}
        accessibilityRole="button"
        activeOpacity={0.8}
      >
        <View className="flex-row items-center gap-4 rounded-full bg-interactive-1 px-8 py-5">
          <Heart
            size={28}
            color="#FFFFFF"
            fill={isFollowing ? "#FFFFFF" : "none"}
          />
          <Text className="text-xl font-bold text-white">
            {isFollowing ? "Following" : "Follow"}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";
