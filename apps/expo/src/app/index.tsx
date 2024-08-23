import React, { useCallback } from "react";
import { Linking, Pressable, SafeAreaView, Text, View } from "react-native";
import Constants from "expo-constants";
import { Stack } from "expo-router";
import { SignedIn, SignedOut, useUser } from "@clerk/clerk-expo";
import { Navigation2 } from "lucide-react-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import UserEventsList from "~/components/UserEventsList";
import { api } from "~/utils/api";
import LoadingSpinner from "../components/LoadingSpinner";
import { ProfileMenu } from "../components/ProfileMenu";
import ShareButton from "../components/ShareButton";
import SignInWithOAuth from "../components/SignInWithOAuth";

import "../styles.css";

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
      </Pressable>
    );
  };

  return (
    <View className="flex-1">
      <Stack.Screen
        options={{
          title: "Soonlist",
          headerTitle: "Soonlist",
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
      {eventsQuery.isLoading ? (
        <LoadingSpinner />
      ) : (
        <UserEventsList
          events={currentAndFutureEvents}
          isRefetching={eventsQuery.isRefetching}
          onRefresh={onRefresh}
          actionButton={goButton}
          showCreator="otherUsers"
        />
      )}
    </View>
  );
}

function App() {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const clerkPublishableKey = Constants.expoConfig?.extra
    ?.clerkPublishableKey as string | undefined;

  if (!clerkPublishableKey) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <Text className="mt-5 text-red-500">
          No Clerk Publishable Key found. Please check your environment.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SignedOut>
        <SignInWithOAuth />
      </SignedOut>
      <SignedIn>
        <MyFeed />
      </SignedIn>
    </>
  );
}

export default App;
