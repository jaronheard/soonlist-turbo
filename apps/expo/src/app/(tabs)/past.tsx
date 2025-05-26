import React, { useCallback, useMemo } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

import { api } from "@soonlist/backend/convex/_generated/api";

import AddEventButton from "~/components/AddEventButton";
import LoadingSpinner from "~/components/LoadingSpinner";
import UserEventsList from "~/components/UserEventsList";
import { useStablePaginatedQuery } from "~/hooks/useStableQuery";
import { useRevenueCat } from "~/providers/RevenueCatProvider";

function PastEventsContent() {
  const { user } = useUser();
  const { customerInfo } = useRevenueCat();
  const hasUnlimited =
    customerInfo?.entitlements.active.unlimited?.isActive ?? false;

  // Memoize query args to prevent unnecessary re-renders
  const queryArgs = useMemo(() => {
    if (!user?.username) return "skip";
    return {
      userName: user.username,
      filter: "past" as const,
    };
  }, [user?.username]);

  const {
    results: events,
    status,
    loadMore,
    isLoading,
  } = useStablePaginatedQuery(api.events.getEventsForUserPaginated, queryArgs, {
    initialNumItems: 20,
  });

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
