import React, { useCallback } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

import AddEventButton from "~/components/AddEventButton";
import LoadingSpinner from "~/components/LoadingSpinner";
import { NavigationMenu } from "~/components/NavigationMenu";
import { ProfileMenu } from "~/components/ProfileMenu";
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
    <>
      <Stack.Screen
        options={{
          headerTitle: () => <NavigationMenu active="past" />,
          headerRight: () => (
            <View className="mr-2 flex-row items-center gap-2">
              <ProfileMenu />
            </View>
          ),
          headerBackTitle: "Back",
          headerBackVisible: true,
        }}
      />
      <View className="flex-1 bg-white">
        {eventsQuery.isPending ? (
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
    </>
  );
}
