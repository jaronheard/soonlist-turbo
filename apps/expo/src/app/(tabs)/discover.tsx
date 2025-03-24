import React, { useCallback, useMemo } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

import type { RouterOutputs } from "~/utils/api";
import AddEventButton from "~/components/AddEventButton";
import LoadingSpinner from "~/components/LoadingSpinner";
import SaveButton from "~/components/SaveButton";
import UserEventsList from "~/components/UserEventsList";
import { api } from "~/utils/api";
import { getPlanStatusFromUser } from "~/utils/plan";

export default function Page() {
  const { user, isLoaded, isSignedIn } = useUser();

  const eventsQuery = api.event.getDiscoverInfinite.useInfiniteQuery(
    {
      limit: 20,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  // Move this hook up before any conditional returns
  const savedEventIdsQuery = api.event.getSavedIdsForUser.useQuery(
    {
      userName: user?.username ?? "",
    },
    {
      // Add enabled option in the second parameter to prevent query when user is not signed in
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

  // Memoize the events array to prevent unnecessary re-renders
  const events = useMemo(
    () => eventsQuery.data?.pages.flatMap((page) => page.events) ?? [],
    [eventsQuery.data?.pages],
  );

  // Memoize the saved event IDs
  const savedEventIds = useMemo(
    () => new Set(savedEventIdsQuery.data?.map((event) => event.id)),
    [savedEventIdsQuery.data],
  );

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
          />
          <AddEventButton />
        </View>
      )}
    </View>
  );
}
