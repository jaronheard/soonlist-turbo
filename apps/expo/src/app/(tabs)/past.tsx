import React, { useCallback, useMemo } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  usePaginatedQuery,
} from "convex/react";

import { api } from "@soonlist/backend";

import AddEventButton from "~/components/AddEventButton";
import LoadingSpinner from "~/components/LoadingSpinner";
import UserEventsList from "~/components/UserEventsList";
import { useRevenueCat } from "~/providers/RevenueCatProvider";

// Type adapter to transform Convex data to match component expectations
function transformConvexEvent(convexEvent: any) {
  return {
    ...convexEvent,
    startDateTime: new Date(convexEvent.startDateTime),
    endDateTime: new Date(convexEvent.endDateTime),
    createdAt: new Date(convexEvent.createdAt),
    updatedAt: convexEvent.updatedAt ? new Date(convexEvent.updatedAt) : null,
    user: convexEvent.user
      ? {
          ...convexEvent.user,
          createdAt: new Date(convexEvent.user.createdAt),
          updatedAt: convexEvent.user.updatedAt
            ? new Date(convexEvent.user.updatedAt)
            : null,
          onboardingCompletedAt: convexEvent.user.onboardingCompletedAt
            ? new Date(convexEvent.user.onboardingCompletedAt)
            : null,
        }
      : convexEvent.user,
    comments:
      convexEvent.comments?.map((comment: any) => ({
        ...comment,
        createdAt: new Date(comment.createdAt),
        updatedAt: comment.updatedAt ? new Date(comment.updatedAt) : null,
      })) || [],
  };
}

function PastEventsContent() {
  const { user } = useUser();
  const { customerInfo } = useRevenueCat();
  const hasUnlimited =
    customerInfo?.entitlements.active.unlimited?.isActive ?? false;

  const {
    results: rawEvents,
    status,
    loadMore,
    isLoading,
  } = usePaginatedQuery(
    api.events.getEventsForUserPaginated,
    {
      userName: user?.username ?? "",
      filter: "past" as const,
    },
    {
      initialNumItems: 20,
    },
  );

  // Transform Convex events to match component expectations
  const events = useMemo(() => {
    return rawEvents?.map(transformConvexEvent) ?? [];
  }, [rawEvents]);

  const handleLoadMore = useCallback(() => {
    if (status === "CanLoadMore") {
      loadMore(20);
    }
  }, [status, loadMore]);

  const onRefresh = useCallback(async () => {
    // Convex queries are automatically reactive, so we don't need manual refresh
    // The usePaginatedQuery will automatically update when data changes
  }, []);

  return (
    <View className="flex-1 bg-white">
      {isLoading && status === "LoadingFirstPage" ? (
        <LoadingSpinner />
      ) : (
        <View className="flex-1">
          <UserEventsList
            events={events}
            onRefresh={onRefresh}
            onEndReached={handleLoadMore}
            showCreator="savedFromOthers"
            isRefetching={status === "LoadingMore"}
            isFetchingNextPage={status === "LoadingMore"}
            hasUnlimited={hasUnlimited}
          />
          <AddEventButton showChevron={false} />
        </View>
      )}
    </View>
  );
}

export default function PastEvents() {
  return (
    <>
      <AuthLoading>
        <View className="flex-1 bg-white">
          <LoadingSpinner />
        </View>
      </AuthLoading>

      <Unauthenticated>
        <Redirect href="/sign-in" />
      </Unauthenticated>

      <Authenticated>
        <PastEventsContent />
      </Authenticated>
    </>
  );
}
