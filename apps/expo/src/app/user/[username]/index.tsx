import React, { useMemo } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import { User } from "~/components/icons";
import UserEventsList from "~/components/UserEventsList";
import { UserProfileFlair } from "~/components/UserProfileFlair";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useStableTimestamp } from "~/store";

export default function UserProfilePage() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const stableTimestamp = useStableTimestamp();

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

  // Enrich events with required properties for UserEventsList
  const enrichedEvents = useMemo(() => {
    const currentTime = new Date(stableTimestamp).getTime();
    return events
      .filter((event) => {
        // Client-side safety filter: hide events that have ended
        const eventEndTime = new Date(event.endDateTime).getTime();
        return eventEndTime >= currentTime;
      })
      .map((event) => ({
        ...event,
        eventFollows: [],
        comments: [],
        eventToLists: [],
        lists: [],
      }));
  }, [events, stableTimestamp]);

  const handleLoadMore = () => {
    if (status === "CanLoadMore") {
      loadMore(25);
    }
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
        }}
      />
      <View className="flex-1 bg-interactive-3">
        {status === "LoadingFirstPage" ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#5A32FB" />
          </View>
        ) : (
          <UserEventsList
            events={enrichedEvents}
            onEndReached={handleLoadMore}
            isFetchingNextPage={status === "LoadingMore"}
            showCreator="never"
            hideDiscoverableButton={true}
            isDiscoverFeed={false}
            HeaderComponent={() => (
              <UserProfileHeader
                user={targetUser}
                eventCount={enrichedEvents.length}
              />
            )}
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

      {/* Username */}
      {user.displayName && (
        <Text className="text-sm text-neutral-2">@{user.username}</Text>
      )}

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

// Export Expo Router's error boundary
export { ErrorBoundary } from "expo-router";
