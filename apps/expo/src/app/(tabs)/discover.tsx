import type { BottomSheetModal } from "@discord/bottom-sheet";
import React, { useCallback, useRef } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { SignedIn, useUser } from "@clerk/clerk-expo";

import type { RouterOutputs } from "~/utils/api";
import AddEventButton from "~/components/AddEventButton";
import CustomBottomSheetModal from "~/components/CustomBottomSheetModal";
import LoadingSpinner from "~/components/LoadingSpinner";
import UserEventsList from "~/components/UserEventsList";
import { api } from "~/utils/api";
import { ProfileMenu } from "../../components/ProfileMenu";
import SaveButton from "../../components/SaveButton";
import ShareButton from "../../components/ShareButton";

export default function Page() {
  const { user } = useUser();
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const eventsQuery = api.event.getDiscover.useQuery({
    limit: 50,
  });
  const savedEventIdsQuery = api.event.getSavedIdsForUser.useQuery({
    userName: user?.username ?? "",
  });
  const utils = api.useUtils();

  const onRefresh = useCallback(() => {
    void utils.event.getDiscover.invalidate();
    void utils.event.getSavedIdsForUser.invalidate();
  }, [utils]);

  if (eventsQuery.isLoading || savedEventIdsQuery.isLoading) {
    return <LoadingSpinner />;
  }

  const events = eventsQuery.data ?? [];
  const currentAndFutureEvents = events.filter(
    (item) => item.startDateTime >= new Date(),
  );

  const savedEventIds = new Set(
    savedEventIdsQuery.data?.map((event) => event.id),
  );

  function SaveButtonWrapper({
    event,
  }: {
    event: RouterOutputs["event"]["getDiscover"][number];
  }) {
    return (
      <SaveButton eventId={event.id} isSaved={savedEventIds.has(event.id)} />
    );
  }

  const handlePresentModalPress = () => bottomSheetRef.current?.present();

  return (
    <View className="flex-1">
      <Stack.Screen
        options={{
          title: "Discover",
          headerTitle: "Discover",
          headerRight: () => (
            <View className="mr-2 flex-row items-center gap-2">
              <SignedIn>
                <ShareButton webPath={`/explore`} />
              </SignedIn>
              <ProfileMenu />
            </View>
          ),
        }}
      />
      <View className="flex-1">
        <UserEventsList
          events={currentAndFutureEvents}
          isRefetching={
            eventsQuery.isRefetching || savedEventIdsQuery.isRefetching
          }
          onRefresh={onRefresh}
          ActionButton={SaveButtonWrapper}
          showCreator="always"
        />
      </View>
      <AddEventButton onPress={handlePresentModalPress} />
      <CustomBottomSheetModal ref={bottomSheetRef} />
    </View>
  );
}
