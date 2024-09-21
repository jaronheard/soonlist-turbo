import type { BottomSheetModal } from "@discord/bottom-sheet";
import React, { useCallback, useRef } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { SignedIn, useUser } from "@clerk/clerk-expo";

import type { RouterOutputs } from "~/utils/api";
import AddEventBottomSheet from "~/components/AddEventBottomSheet";
import AddEventButton from "~/components/AddEventButton";
import LoadingSpinner from "~/components/LoadingSpinner";
import UserEventsList from "~/components/UserEventsList";
import { api } from "~/utils/api";
import { ProfileMenu } from "../../components/ProfileMenu";
import SaveButton from "../../components/SaveButton";
import ShareButton from "../../components/ShareButton";

export default function Page() {
  const { user } = useUser();
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const eventsQuery = api.event.getDiscoverInfinite.useInfiniteQuery(
    {
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

  const savedEventIdsQuery = api.event.getSavedIdsForUser.useQuery({
    userName: user?.username ?? "",
  });

  const savedEventIds = new Set(
    savedEventIdsQuery.data?.map((event) => event.id),
  );

  function SaveButtonWrapper({
    event,
  }: {
    event: RouterOutputs["event"]["getDiscoverInfinite"]["events"][number];
  }) {
    return (
      <SaveButton eventId={event.id} isSaved={savedEventIds.has(event.id)} />
    );
  }

  const handlePresentModalPress = () => bottomSheetRef.current?.present();

  if (eventsQuery.isLoading || savedEventIdsQuery.isLoading) {
    return <LoadingSpinner />;
  }

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
          events={events}
          isRefetching={eventsQuery.isRefetching}
          onRefresh={onRefresh}
          onEndReached={loadMore}
          isFetchingNextPage={eventsQuery.isFetchingNextPage}
          ActionButton={SaveButtonWrapper}
          showCreator="always"
        />
      </View>
      <AddEventButton onPress={handlePresentModalPress} />
      <AddEventBottomSheet ref={bottomSheetRef} />
    </View>
  );
}
