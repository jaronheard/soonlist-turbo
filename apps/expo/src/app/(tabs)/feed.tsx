import React, { useCallback } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useMutationState } from "@tanstack/react-query";

import AddEventButton from "~/components/AddEventButton";
import LoadingSpinner from "~/components/LoadingSpinner";
import UserEventsList from "~/components/UserEventsList";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { useAppStore } from "~/store";
import { api } from "~/utils/api";

function MyFeed() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { hasCompletedOnboarding } = useAppStore();
  const { customerInfo } = useRevenueCat();
  const hasUnlimited =
    customerInfo?.entitlements.active.unlimited?.isActive ?? false;

  const userQuery = api.user.getById.useQuery(
    { id: user?.id ?? "" },
    { enabled: isLoaded && isSignedIn && !!user.id },
  );

  const eventsQuery = api.event.getEventsForUser.useInfiniteQuery(
    {
      userName: user?.username ?? "",
      filter: "upcoming",
      limit: 20,
    },
    {
      enabled: isLoaded && !!user && isSignedIn,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  const statsQuery = api.event.getStats.useQuery({
    userName: user?.username ?? "",
  });

  const onRefresh = useCallback(async () => {
    await eventsQuery.refetch();
  }, [eventsQuery]);

  const loadMore = useCallback(() => {
    if (eventsQuery.hasNextPage && !eventsQuery.isFetchingNextPage) {
      void eventsQuery.fetchNextPage();
    }
  }, [eventsQuery]);

  const events = eventsQuery.data?.pages.flatMap((page) => page.events) ?? [];

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
      {eventsQuery.isPending && !eventsQuery.isRefetching && !isAddingEvent ? (
        <LoadingSpinner />
      ) : (
        <View className="flex-1">
          <UserEventsList
            events={events}
            isRefetching={eventsQuery.isRefetching}
            onRefresh={onRefresh}
            onEndReached={loadMore}
            isFetchingNextPage={eventsQuery.isFetchingNextPage}
            showCreator="otherUsers"
            stats={statsQuery.data}
            promoCard={{ type: "addEvents" }}
            hasUnlimited={hasUnlimited}
          />
          <AddEventButton showChevron={noLifetimeCaptures} />
        </View>
      )}
    </View>
  );
}

export default MyFeed;
