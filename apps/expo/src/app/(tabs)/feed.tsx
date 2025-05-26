import React, { useCallback } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useMutationState } from "@tanstack/react-query";
import { usePaginatedQuery } from "convex/react";

import { api } from "@soonlist/backend";

import AddEventButton from "~/components/AddEventButton";
import LoadingSpinner from "~/components/LoadingSpinner";
import UserEventsList from "~/components/UserEventsList";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore } from "~/store";
import { api as tRPCApi } from "~/utils/api";

function MyFeed() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { hasCompletedOnboarding } = useAppStore();
  const { customerInfo } = useRevenueCat();
  const hasUnlimited =
    customerInfo?.entitlements.active.unlimited?.isActive ?? false;

  const userQuery = tRPCApi.user.getById.useQuery(
    { id: user?.id ?? "" },
    { enabled: isLoaded && isSignedIn && !!user?.id },
  );

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

  const statsQuery = tRPCApi.event.getStats.useQuery({
    userName: user?.username ?? "",
  });

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

  const noLifetimeCaptures = statsQuery.data?.allTimeEvents === 0;

  if (!isLoaded) {
    return (
      <View className="flex-1 bg-white">
        <LoadingSpinner />
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  const dbHasCompletedOnboarding = !!userQuery.data?.onboardingCompletedAt;
  if (!hasCompletedOnboarding && !dbHasCompletedOnboarding) {
    return <Redirect href="/(onboarding)/onboarding" />;
  }

  return (
    <View className="flex-1 bg-white">
      {isLoading && status === "LoadingFirstPage" && !isAddingEvent ? (
        <LoadingSpinner />
      ) : (
        <View className="flex-1">
          <UserEventsList
            events={events ?? []}
            isRefetching={status === "LoadingMore"}
            onRefresh={onRefresh}
            onEndReached={handleLoadMore}
            isFetchingNextPage={status === "LoadingMore"}
            showCreator="savedFromOthers"
            stats={statsQuery.data}
            promoCard={{ type: "addEvents" }}
            hasUnlimited={hasUnlimited}
          />
          <AddEventButton
            showChevron={noLifetimeCaptures}
            stats={statsQuery.data}
          />
        </View>
      )}
    </View>
  );
}

export default MyFeed;
