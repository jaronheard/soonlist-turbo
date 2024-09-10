import type { BottomSheetModal } from "@discord/bottom-sheet";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { SignedIn, useUser } from "@clerk/clerk-expo";
import { Navigation2 } from "lucide-react-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import AddEventButton from "~/components/AddEventButton";
import CustomBottomSheetModal from "~/components/CustomBottomSheetModal";
import LoadingSpinner from "~/components/LoadingSpinner";
import { ProfileMenu } from "~/components/ProfileMenu";
import ShareButton from "~/components/ShareButton";
import UserEventsList from "~/components/UserEventsList";
import { api } from "~/utils/api";
import { getKeyChainAccessGroup } from "~/utils/getKeyChainAccessGroup";

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
    const checkForIntent = async () => {
      const keyChainAccessGroup = getKeyChainAccessGroup();
      const intentType = await SecureStore.getItemAsync("intentType", {
        keychainAccessGroup: keyChainAccessGroup,
      });
      if (intentType === "new") {
        const text = await SecureStore.getItemAsync("intentText", {
          keychainAccessGroup: keyChainAccessGroup,
        });
        const imageUri = await SecureStore.getItemAsync("intentImageUri", {
          keychainAccessGroup: keyChainAccessGroup,
        });
        setIntentParams({
          text: text ?? undefined,
          imageUri: imageUri ?? undefined,
        });

        // Clear the stored intent data
        await SecureStore.deleteItemAsync("intentType", {
          keychainAccessGroup: keyChainAccessGroup,
        });
        await SecureStore.deleteItemAsync("intentText", {
          keychainAccessGroup: keyChainAccessGroup,
        });
        await SecureStore.deleteItemAsync("intentImageUri", {
          keychainAccessGroup: keyChainAccessGroup,
        });

        // Open the bottom sheet
        bottomSheetRef.current?.present();
      }
    };

    void checkForIntent();
  }, []);

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
            <CustomBottomSheetModal
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
