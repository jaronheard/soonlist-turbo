import type { BottomSheetModal } from "@discord/bottom-sheet";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Pressable, View } from "react-native";
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

function MyFeed() {
  const { user } = useUser();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [intentParams, setIntentParams] = useState<{
    text?: string;
    imageUri?: string;
  } | null>(null);
  const { handleIntent } = useIntentHandler();

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
            <UserEventsList
              events={currentAndFutureEvents}
              isRefetching={eventsQuery.isRefetching}
              onRefresh={onRefresh}
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
