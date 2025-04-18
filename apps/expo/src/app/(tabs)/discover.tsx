import React, { useCallback } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

import type { RouterOutputs } from "~/utils/api";
import AddEventButton from "~/components/AddEventButton";
import LoadingSpinner from "~/components/LoadingSpinner";
import SaveButton from "~/components/SaveButton";
import UserEventsList from "~/components/UserEventsList";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import { api } from "~/utils/api";
import { getPlanStatusFromUser } from "~/utils/plan";

export default function Page() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { customerInfo } = useRevenueCat();
  const hasUnlimited =
    customerInfo?.entitlements.active.unlimited?.isActive ?? false;

  const eventsQuery = api.event.getDiscoverInfinite.useInfiniteQuery(
    {
      limit: 20,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  const savedEventIdsQuery = api.event.getSavedIdsForUser.useQuery(
    {
      userName: user?.username ?? "",
    },
    {
      enabled: isLoaded && isSignedIn && !!user && !!user.username,
    },
  );

  const onRefresh = useCallback(async () => {
    await eventsQuery.refetch();
  }, [eventsQuery]);

  const loadMore = useCallback(() => {
    if (eventsQuery.hasNextPage && !eventsQuery.isFetchingNextPage) {
      void eventsQuery.fetchNextPage();
    }
  }, [eventsQuery]);

  const events = eventsQuery.data?.pages.flatMap((page) => page.events) ?? [];

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

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  const { showDiscover } = getPlanStatusFromUser(user);

  if (!showDiscover) {
    return <Redirect href="/feed" />;
  }

  const savedEventIds = new Set(
    savedEventIdsQuery.data?.map((event) => event.id),
  );

  function SaveButtonWrapper({
    event,
  }: {
    event: RouterOutputs["event"]["getDiscoverInfinite"]["events"][number];
  }) {
    return (
      <SaveButton eventId={event.id} isSaved={savedEventIds.has(event.id)} />
    );
  }

  return (
    <View className="flex-1 bg-white">
      {eventsQuery.isPending && !eventsQuery.isRefetching ? (
        <LoadingSpinner />
      ) : (
        <View className="flex-1">
          <UserEventsList
            events={events}
            isRefetching={eventsQuery.isRefetching}
            onRefresh={onRefresh}
            onEndReached={loadMore}
            isFetchingNextPage={eventsQuery.isFetchingNextPage}
            ActionButton={SaveButtonWrapper}
            showCreator="always"
            hasUnlimited={hasUnlimited}
            hideDiscoverableButton={true}
          />
          <AddEventButton />
        </View>
      )}
    </View>
  );
}
