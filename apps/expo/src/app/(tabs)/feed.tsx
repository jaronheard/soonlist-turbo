import React, { useCallback, useMemo } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useMutationState } from "@tanstack/react-query";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  usePaginatedQuery,
} from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import AddEventButton from "~/components/AddEventButton";
import LoadingSpinner from "~/components/LoadingSpinner";
import UserEventsList from "~/components/UserEventsList";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore } from "~/store";

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

function MyFeedContent() {
  const { user } = useUser();
  // const { hasCompletedOnboarding } = useAppStore();
  const { customerInfo } = useRevenueCat();
  const hasUnlimited =
    customerInfo?.entitlements.active.unlimited?.isActive ?? false;

  // const userQuery = tRPCApi.user.getById.useQuery(
  //   { id: user?.id ?? "" },
  //   { enabled: !!user?.id },
  // );

  const {
    results: rawEvents,
    status,
    loadMore,
    isLoading,
  } = usePaginatedQuery(
    api.events.getEventsForUserPaginated,
    {
      userName: user?.username ?? "",
      filter: "upcoming" as const,
    },
    {
      initialNumItems: 20,
    },
  );

  // Transform Convex events to match component expectations
  const events = useMemo(() => {
    return rawEvents?.map(transformConvexEvent) ?? [];
  }, [rawEvents]);

  const onRefresh = useCallback(async () => {
    // Convex queries are automatically reactive, so we don't need manual refresh
    // The usePaginatedQuery will automatically update when data changes
  }, []);

  const handleLoadMore = useCallback(() => {
    if (status === "CanLoadMore") {
      loadMore(20);
    }
  }, [status, loadMore]);

  const pendingAIMutations = useMutationState({
    filters: {
      mutationKey: ["ai"],
      status: "pending",
    },
  });

  const isAddingEvent = pendingAIMutations.length > 0;

  // Check onboarding status after all hooks
  // const dbHasCompletedOnboarding = !!userQuery.data?.onboardingCompletedAt;
  // if (!hasCompletedOnboarding && !dbHasCompletedOnboarding) {
  //   return <Redirect href="/(onboarding)/onboarding" />;
  // }

  return (
    <View className="flex-1 bg-white">
      {isLoading && status === "LoadingFirstPage" && !isAddingEvent ? (
        <LoadingSpinner />
      ) : (
        <View className="flex-1">
          <UserEventsList
            events={events}
            isRefetching={status === "LoadingMore"}
            onRefresh={onRefresh}
            onEndReached={handleLoadMore}
            isFetchingNextPage={status === "LoadingMore"}
            showCreator="savedFromOthers"
            stats={undefined}
            promoCard={{ type: "addEvents" }}
            hasUnlimited={hasUnlimited}
          />
          <AddEventButton stats={undefined} />
        </View>
      )}
    </View>
  );
}

function MyFeed() {
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
        <MyFeedContent />
      </Authenticated>
    </>
  );
}

export default MyFeed;
