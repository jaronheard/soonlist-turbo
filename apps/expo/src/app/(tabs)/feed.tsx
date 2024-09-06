import React, { useCallback } from "react";
import { Linking, Pressable, View } from "react-native";
import { Stack } from "expo-router";
import { SignedIn, useUser } from "@clerk/clerk-expo";
import { Navigation2 } from "lucide-react-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import AddEventButton from "~/components/AddEventButton";
import LoadingSpinner from "~/components/LoadingSpinner";
import { ProfileMenu } from "~/components/ProfileMenu";
import ShareButton from "~/components/ShareButton";
import UserEventsList from "~/components/UserEventsList";
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

function MyFeed() {
  const { user } = useUser();

  const eventsQuery = api.event.getUpcomingForUser.useQuery({
    userName: user?.username ?? "",
  });
  const utils = api.useUtils();

  const onRefresh = useCallback(() => {
    void utils.event.getUpcomingForUser.invalidate();
  }, [utils]);

  const events = eventsQuery.data ?? [];
  const currentAndFutureEvents = events.filter(
    (item) => item.startDateTime >= new Date() || item.endDateTime > new Date(),
  );

  return (
    <View className="flex-1">
      <Stack.Screen
        options={{
          title: "My Feed",
          headerTitle: "My Feed",
          headerRight: () => (
            <View className="flex-row items-center gap-1">
              <SignedIn>
                <ShareButton webPath={`/${user?.username}/upcoming`} />
              </SignedIn>
              <ProfileMenu />
            </View>
          ),
        }}
      />
      {eventsQuery.isLoading ? (
        <LoadingSpinner />
      ) : (
        <UserEventsList
          events={currentAndFutureEvents}
          isRefetching={eventsQuery.isRefetching}
          onRefresh={onRefresh}
          ActionButton={GoButton}
          showCreator="otherUsers"
        />
      )}
      <AddEventButton />
    </View>
  );
}

export default MyFeed;
