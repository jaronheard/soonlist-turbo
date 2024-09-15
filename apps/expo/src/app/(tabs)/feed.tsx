import type { BottomSheetModal } from "@discord/bottom-sheet";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { Stack } from "expo-router";
import { SignedIn, useUser } from "@clerk/clerk-expo";
import { Navigation2 } from "lucide-react-native";

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
      <Navigation2 color="white" size={20} fill="white" />
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
  const [intentParams, setIntentParams] = useState<{
    text?: string;
    imageUri?: string;
  } | null>(null);
  const { handleIntent } = useIntentHandler();

  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");

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

  const onRefresh = useCallback(() => {
    void eventsQuery.refetch();
  }, [eventsQuery]);

  const loadMore = useCallback(() => {
    if (eventsQuery.hasNextPage && !eventsQuery.isFetchingNextPage) {
      void eventsQuery.fetchNextPage();
    }
  }, [eventsQuery]);

  const events = eventsQuery.data?.pages.flatMap((page) => page.events) ?? [];

  const handlePresentModalPress = () => bottomSheetRef.current?.present();

  useEffect(() => {
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        const intent = handleIntent(initialUrl);
        if (intent && intent.type === "new") {
          setIntentParams({
            text: intent.text,
            imageUri: intent.imageUri,
          });
          handlePresentModalPress();
        }
      }
    };

    void handleInitialURL();

    const subscription = Linking.addEventListener("url", ({ url }) => {
      const intent = handleIntent(url);
      if (intent && intent.type === "new") {
        setIntentParams({
          text: intent.text,
          imageUri: intent.imageUri,
        });
        handlePresentModalPress();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [handleIntent]);

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
        {eventsQuery.isLoading ? (
          <LoadingSpinner />
        ) : (
          <View className="flex-1">
            <View className="flex-row justify-center border-b border-gray-200">
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
              initialParams={intentParams}
            />
          </View>
        )}
      </View>
    </>
  );
}

export default MyFeed;
