import React, { useCallback, useEffect } from "react";
import { Linking, Pressable, View } from "react-native";
import { Stack } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useMutationState } from "@tanstack/react-query";
import { MapPinned } from "lucide-react-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import AddEventButton from "~/components/AddEventButton";
import { HeaderLogo } from "~/components/HeaderLogo";
import LoadingSpinner from "~/components/LoadingSpinner";
import { NavigationMenu } from "~/components/NavigationMenu";
import { ProfileMenu } from "~/components/ProfileMenu";
import UserEventsList from "~/components/UserEventsList";
import { useIntentHandler } from "~/hooks/useIntentHandler";
import { api } from "~/utils/api";

function GoButton({
  event,
}: {
  event: RouterOutputs["event"]["getUpcomingForUser"][number];
}) {
  const openGoogleMaps = (location: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`;
    void Linking.openURL(url);
  };

  const eventData = event.event as AddToCalendarButtonPropsRestricted;
  const location = eventData.location;

  return (
    <Pressable
      onPress={() =>
        location ? openGoogleMaps(location) : console.log("No location")
      }
      className="flex-row items-center rounded-full bg-interactive-1/90 p-2"
    >
      <MapPinned color="white" size={20} />
    </Pressable>
  );
}

function MyFeed() {
  const { user } = useUser();
  const { handleIntent } = useIntentHandler();

  const eventsQuery = api.event.getEventsForUser.useInfiniteQuery(
    {
      userName: user?.username ?? "",
      filter: "upcoming",
      limit: 20,
    },
    {
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

  // Track any pending AI mutations
  const pendingAIMutations = useMutationState({
    filters: {
      mutationKey: ["ai"],
      status: "pending",
    },
  });

  const isAddingEvent = pendingAIMutations.length > 0;

  useEffect(() => {
    console.log("Setting up URL handling effect");

    const handleInitialURL = async () => {
      console.log("Handling initial URL");
      const initialUrl = await Linking.getInitialURL();
      console.log("Initial URL:", initialUrl);
      if (initialUrl) {
        handleIntent(initialUrl);
      }
    };

    void handleInitialURL();

    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleIntent(url);
    });

    return () => {
      console.log("Cleaning up URL handling effect");
      subscription.remove();
    };
  }, [handleIntent]);

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => <NavigationMenu active="upcoming" />,
          headerLeft: () => <HeaderLogo />,
          headerRight: () => (
            <View className="mr-2">
              <ProfileMenu showShare />
            </View>
          ),
          headerBackVisible: false,
        }}
      />
      <View className="flex-1 bg-white">
        {eventsQuery.isPending && !isAddingEvent ? (
          <LoadingSpinner />
        ) : (
          <View className="flex-1">
            <UserEventsList
              events={events}
              isRefetching={eventsQuery.isRefetching}
              onRefresh={onRefresh}
              onEndReached={loadMore}
              isFetchingNextPage={eventsQuery.isFetchingNextPage}
              ActionButton={GoButton}
              showCreator="otherUsers"
              stats={statsQuery.data}
              promoCard={{ type: "addEvents" }}
            />
            <AddEventButton />
          </View>
        )}
      </View>
    </>
  );
}

export default MyFeed;
