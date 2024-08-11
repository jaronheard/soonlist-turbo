import { Linking, Pressable, RefreshControl, View } from "react-native";
import { Stack } from "expo-router";
import { SignedIn, useUser } from "@clerk/clerk-expo";
import { Navigation2 } from "lucide-react-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import LoadingSpinner from "~/components/LoadingSpinner";
import UserEventsList from "~/components/UserEventsList";
import { api } from "~/utils/api";
import { ProfileMenu } from "./ProfileMenu";
import ShareButton from "./ShareButton";

export default function MyFeed() {
  const { user } = useUser();

  const eventsQuery = api.event.getUpcomingForUser.useQuery({
    userName: user?.username ?? "",
  });
  const utils = api.useUtils();

  const onRefresh = () => {
    void utils.event.invalidate();
  };

  if (eventsQuery.isLoading) {
    return <LoadingSpinner />;
  }

  const events = eventsQuery.data ?? [];
  const currentAndFutureEvents = events.filter(
    (item) => item.startDateTime >= new Date(),
  );

  const openGoogleMaps = (location: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`;
    void Linking.openURL(url);
  };

  const goButton = (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
  ) => {
    if (!event.event) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const eventData = event.event as AddToCalendarButtonPropsRestricted;
    return (
      <Pressable
        onPress={() =>
          eventData.location
            ? openGoogleMaps(eventData.location)
            : console.log("No location")
        }
        className="flex-row items-center rounded-full bg-interactive-1/90 p-2"
      >
        <Navigation2 color="white" size={16} fill="white" />
        {/* <Text className="ml-1 text-2xl font-bold text-white">Go</Text> */}
      </Pressable>
    );
  };

  return (
    <View className="flex-1">
      <Stack.Screen
        options={{
          title: "Soonlist",
          headerRight: () => (
            <View className="-mr-2 flex-row items-center gap-1">
              <SignedIn>
                <ShareButton webPath={`/${user?.username}/upcoming`} />
              </SignedIn>
              <ProfileMenu />
            </View>
          ),
        }}
      />
      <UserEventsList
        events={currentAndFutureEvents}
        refreshControl={
          <RefreshControl
            refreshing={eventsQuery.isRefetching}
            onRefresh={onRefresh}
          />
        }
        actionButton={goButton}
      />
    </View>
  );
}
