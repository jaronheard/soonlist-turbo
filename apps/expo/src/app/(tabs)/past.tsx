import React, { useCallback } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { usePaginatedQuery } from "convex/react";

import { api } from "@soonlist/backend";

import AddEventButton from "~/components/AddEventButton";
import LoadingSpinner from "~/components/LoadingSpinner";
import UserEventsList from "~/components/UserEventsList";
import { useRevenueCat } from "~/providers/RevenueCatProvider";

export default function PastEvents() {
  const { user, isLoaded, isSignedIn } = useUser();
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
      filter: "past" as const,
    },
    {
      initialNumItems: 20,
    },
  );

  const handleLoadMore = useCallback(() => {
    if (status === "CanLoadMore") {
      loadMore(20);
    }
  }, [status, loadMore]);

  const onRefresh = useCallback(async () => {
    // Convex queries are automatically reactive, so we don't need manual refresh
    // The usePaginatedQuery will automatically update when data changes
  }, []);

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

  return (
    <View className="flex-1 bg-white">
      {isLoading && status === "LoadingFirstPage" ? (
        <LoadingSpinner />
      ) : (
        <View className="flex-1">
          <UserEventsList
            events={events ?? []}
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
