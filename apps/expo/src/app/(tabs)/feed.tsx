import React, { useCallback } from "react";
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

function MyFeedContent() {
  const { user } = useUser();
  // const { hasCompletedOnboarding } = useAppStore();
  const { customerInfo } = useRevenueCat();
  const hasUnlimited =
    customerInfo?.entitlements.active.unlimited?.isActive ?? false;

  const {
    results: events,
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
