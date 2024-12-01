import type { BottomSheetModal } from "@discord/bottom-sheet";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { Stack } from "expo-router";
import { SignedIn, useUser } from "@clerk/clerk-expo";
import { Map } from "lucide-react-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import AddEventBottomSheet from "~/components/AddEventBottomSheet";
import AddEventButton from "~/components/AddEventButton";
import LoadingSpinner from "~/components/LoadingSpinner";
import { ProfileMenu } from "~/components/ProfileMenu";
import ShareButton from "~/components/ShareButton";
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
      <Map color="white" size={20} />
    </Pressable>
  );
}

function FilterButton({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="px-3 py-2"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <View className={`${isActive ? "border-b-2 border-interactive-1" : ""}`}>
        <Text
          className={`text-sm font-medium ${
            isActive ? "text-interactive-1" : "text-gray-400"
          }`}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function MyFeed() {
  const { user } = useUser();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const { handleIntent } = useIntentHandler();
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");
  const [isBottomSheetMounted, setIsBottomSheetMounted] = useState(false);
  const pendingPresentRef = useRef(false);

  const eventsQuery = api.event.getEventsForUser.useInfiniteQuery(
    {
      userName: user?.username ?? "",
      filter,
      limit: 20,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
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

  const handlePresentModalPress = useCallback(() => {
    console.log("Attempting to present modal");
    if (isBottomSheetMounted && bottomSheetRef.current) {
      console.log("Presenting modal immediately");
      bottomSheetRef.current.present();
    } else {
      console.log("Queueing modal presentation");
      pendingPresentRef.current = true;
    }
  }, [isBottomSheetMounted]);

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

  useEffect(() => {
    if (
      isBottomSheetMounted &&
      bottomSheetRef.current &&
      pendingPresentRef.current
    ) {
      console.log("Presenting queued modal");
      bottomSheetRef.current.present();
      pendingPresentRef.current = false;
    }
  }, [isBottomSheetMounted]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "My Feed",
          headerTitle: "My Feed",
          headerRight: () => (
            <View className="mr-2 flex-row items-center gap-2">
              <SignedIn>
                <ShareButton webPath={`/${user?.username}/upcoming`} />
              </SignedIn>
              <ProfileMenu />
            </View>
          ),
        }}
      />
      <View className="flex-1">
        {eventsQuery.isPending ? (
          <LoadingSpinner />
        ) : (
          <View className="flex-1">
            <View className="flex-row justify-center border-b border-gray-200 bg-interactive-3">
              <FilterButton
                label="Upcoming"
                isActive={filter === "upcoming"}
                onPress={() => setFilter("upcoming")}
              />
              <FilterButton
                label="Past"
                isActive={filter === "past"}
                onPress={() => setFilter("past")}
              />
            </View>
            <UserEventsList
              events={events}
              isRefetching={eventsQuery.isRefetching}
              onRefresh={onRefresh}
              onEndReached={loadMore}
              isFetchingNextPage={eventsQuery.isFetchingNextPage}
              ActionButton={GoButton}
              showCreator="otherUsers"
            />
            <AddEventButton onPress={handlePresentModalPress} />
            <AddEventBottomSheet
              ref={bottomSheetRef}
              onMount={() => setIsBottomSheetMounted(true)}
            />
          </View>
        )}
      </View>
    </>
  );
}

export default MyFeed;
