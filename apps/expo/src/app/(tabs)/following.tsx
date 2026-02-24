import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { Redirect, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import FollowingFeedbackBanner from "~/components/FollowingFeedbackBanner";
import { X } from "~/components/icons";
import LoadingSpinner from "~/components/LoadingSpinner";
import { TabHeader } from "~/components/TabHeader";
import UserEventsList from "~/components/UserEventsList";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useAppStore, useStableTimestamp } from "~/store";
import { hapticSuccess, toast } from "~/utils/feedback";

function FollowingHeader() {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();
  const followingUsers = useQuery(api.users.getFollowingUsers);
  const unfollowUserMutation = useMutation(api.users.unfollowUser);

  const userCount = followingUsers?.length ?? 0;

  const handleUnfollow = async (userId: string) => {
    try {
      await unfollowUserMutation({ followingId: userId });
      void hapticSuccess();
    } catch {
      toast.error("Failed to unfollow user");
    }
  };

  if (userCount === 0) {
    return null;
  }

  return (
    <View>
      <View style={{ paddingVertical: 12 }}>
        <FollowingFeedbackBanner />
      </View>
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <TouchableOpacity
          onPress={() => setIsExpanded(!isExpanded)}
          style={{ alignItems: "center" }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 14, color: "#627496" }}>
            Following{" "}
            <Text style={{ color: "#5A32FB" }}>
              {userCount} {userCount === 1 ? "list" : "lists"}
            </Text>
          </Text>
        </TouchableOpacity>

        {isExpanded && followingUsers && (
          <View style={{ marginTop: 12, gap: 8 }}>
            {followingUsers.map((user) => (
              <View
                key={user.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 8,
                }}
              >
                <TouchableOpacity
                  onPress={() => router.push(`/${user.username}`)}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                  activeOpacity={0.7}
                >
                  {user.userImage ? (
                    <Image
                      source={{ uri: user.userImage }}
                      style={{ width: 32, height: 32, borderRadius: 9999 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 9999,
                        backgroundColor: "#E8E8E8",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "500",
                          color: "#627496",
                        }}
                      >
                        {user.displayName?.charAt(0).toUpperCase() ?? "?"}
                      </Text>
                    </View>
                  )}
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "500",
                        color: "#1A1A2E",
                      }}
                      numberOfLines={1}
                    >
                      {user.publicListName ??
                        `${user.displayName ?? user.username}'s events`}
                    </Text>
                    <Text
                      style={{ fontSize: 14, color: "#627496" }}
                      numberOfLines={1}
                    >
                      {user.displayName ?? user.username}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleUnfollow(user.id)}
                  style={{
                    marginLeft: 8,
                    borderRadius: 9999,
                    backgroundColor: "#E8E8E8",
                    padding: 8,
                  }}
                  activeOpacity={0.7}
                >
                  <X size={16} color="#666" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function FollowingEmptyState() {
  return (
    <ScrollView
      style={{ backgroundColor: "#F4F1FF" }}
      contentContainerStyle={{
        paddingBottom: 120,
        flexGrow: 1,
      }}
      showsVerticalScrollIndicator={false}
    >
      <FollowingHeader />
      <View
        style={{
          alignItems: "center",
          paddingHorizontal: 24,
          paddingVertical: 32,
        }}
      >
        <Text style={{ textAlign: "center", fontSize: 18, color: "#627496" }}>
          No upcoming events from people you follow
        </Text>
        <Text
          style={{
            marginTop: 8,
            textAlign: "center",
            fontSize: 16,
            color: "#9CA3AF",
          }}
        >
          Check back later for new events
        </Text>
      </View>
    </ScrollView>
  );
}

function FollowingFeedContent() {
  const { user } = useUser();
  const [selectedSegment, setSelectedSegment] = useState(0);
  const filter: "upcoming" | "past" =
    selectedSegment === 0 ? "upcoming" : "past";

  const stableTimestamp = useStableTimestamp();
  const setBoardBadgeCount = useAppStore((s) => s.setBoardBadgeCount);

  // Check if user is following anyone
  const followingUsers = useQuery(api.users.getFollowingUsers);
  const hasFollowings = (followingUsers?.length ?? 0) > 0;

  const queryArgs = useMemo(() => {
    return {
      filter,
    };
  }, [filter]);

  const {
    results: events,
    status,
    loadMore,
  } = useStablePaginatedQuery(
    api.feeds.getFollowedUsersFeed,
    hasFollowings ? queryArgs : "skip",
    {
      initialNumItems: 50,
    },
  );

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

  const enrichedEvents = useMemo(() => {
    if (filter === "upcoming") {
      const currentTime = new Date(stableTimestamp).getTime();
      return events
        .filter((event) => {
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
    }
    // Past events - no client-side time filtering
    return events.map((event) => ({
      ...event,
      eventFollows: [],
      comments: [],
      eventToLists: [],
      lists: [],
    }));
  }, [events, stableTimestamp, filter]);

  // Update badge count based on upcoming events
  useEffect(() => {
    if (filter === "upcoming") {
      setBoardBadgeCount(enrichedEvents.length);
    }
  }, [enrichedEvents.length, filter, setBoardBadgeCount]);

  const HeaderWithSegment = useCallback(
    () => (
      <View>
        <TabHeader
          variant="board"
          selectedSegmentIndex={selectedSegment}
          onSegmentChange={setSelectedSegment}
        />
        <FollowingHeader />
      </View>
    ),
    [selectedSegment],
  );

  // Redirect to feed if not following anyone
  if (followingUsers !== undefined && !hasFollowings) {
    return <Redirect href="/feed" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <UserEventsList
        events={enrichedEvents}
        onEndReached={handleLoadMore}
        isFetchingNextPage={status === "LoadingMore"}
        isLoadingFirstPage={
          status === "LoadingFirstPage" || followingUsers === undefined
        }
        showCreator="always"
        showSourceStickers={false}
        hideDiscoverableButton={true}
        savedEventIds={savedEventIds}
        source="following"
        HeaderComponent={HeaderWithSegment}
        EmptyStateComponent={FollowingEmptyState}
      />
    </View>
  );
}

function FollowingFeed() {
  const hasSeenOnboarding = useAppStore((state) => state.hasSeenOnboarding);

  return (
    <>
      <AuthLoading>
        <View style={{ flex: 1, backgroundColor: "#F4F1FF" }}>
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
