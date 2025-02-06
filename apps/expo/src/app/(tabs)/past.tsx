import React, { useCallback } from "react";
import { View } from "react-native";
import { useUser } from "@clerk/clerk-expo";

import AddEventButton from "~/components/AddEventButton";
import LoadingSpinner from "~/components/LoadingSpinner";
import UserEventsList from "~/components/UserEventsList";
import { api } from "~/utils/api";

export default function PastEvents() {
  const { user } = useUser();

  const eventsQuery = api.event.getEventsForUser.useInfiniteQuery(
    {
      userName: user?.username ?? "",
      filter: "past",
      limit: 20,
    },
    {
      enabled: !!user,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  const loadMore = useCallback(() => {
    if (eventsQuery.hasNextPage && !eventsQuery.isFetchingNextPage) {
      void eventsQuery.fetchNextPage();
    }
  }, [eventsQuery]);

  const onRefresh = useCallback(async () => {
    await eventsQuery.refetch();
  }, [eventsQuery]);

  const events = eventsQuery.data?.pages.flatMap((page) => page.events) ?? [];

  return (
    <View className="flex-1 bg-white">
      {eventsQuery.isPending && !eventsQuery.isRefetching ? (
        <LoadingSpinner />
      ) : (
        <View className="flex-1">
          <UserEventsList
            events={events}
            onRefresh={onRefresh}
            onEndReached={loadMore}
            showCreator="otherUsers"
            isRefetching={eventsQuery.isRefetching}
            isFetchingNextPage={eventsQuery.isFetchingNextPage}
          />
          <AddEventButton />
        </View>
      )}
    </View>
  );
}
