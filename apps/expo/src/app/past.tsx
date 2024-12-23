import React, { useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

import AddEventButton from "~/components/AddEventButton";
import LoadingSpinner from "~/components/LoadingSpinner";
import { ProfileMenu } from "~/components/ProfileMenu";
import UserEventsList from "~/components/UserEventsList";
import { api } from "~/utils/api";

function HeaderTabs({ active }: { active: "upcoming" | "past" | "discover" }) {
  const router = useRouter();

  return (
    <View className="flex-row">
      <Pressable onPress={() => router.push("/feed")} className="mr-4">
        <Text
          className={active === "upcoming" ? "text-blue-600" : "text-black"}
        >
          Upcoming
        </Text>
      </Pressable>
      <Pressable onPress={() => router.push("/past")} className="mr-4">
        <Text className={active === "past" ? "text-blue-600" : "text-black"}>
          Past
        </Text>
      </Pressable>
      <Pressable onPress={() => router.push("/discover")}>
        <Text
          className={active === "discover" ? "text-blue-600" : "text-black"}
        >
          Discover
        </Text>
      </Pressable>
    </View>
  );
}

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

  if (eventsQuery.isLoading) {
    return <LoadingSpinner />;
  }

  const events = eventsQuery.data?.pages.flatMap((page) => page.events) ?? [];

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => <HeaderTabs active="past" />,
          headerRight: () => (
            <View className="mr-2 flex-row items-center gap-2">
              <ProfileMenu />
            </View>
          ),
        }}
      />
      <View className="flex-1 bg-white">
        <UserEventsList
          events={events}
          onRefresh={onRefresh}
          onEndReached={loadMore}
          showCreator="otherUsers"
          isRefetching={eventsQuery.isRefetching}
          isFetchingNextPage={eventsQuery.isFetchingNextPage}
          // ... rest of props ...
        />
        <AddEventButton />
      </View>
    </>
  );
}
