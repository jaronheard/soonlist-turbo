import { useCallback } from "react";
import { RefreshControl, View } from "react-native";
import { Stack } from "expo-router";
import { SignedIn, useUser } from "@clerk/clerk-expo";

import type { RouterOutputs } from "~/utils/api";
import LoadingSpinner from "~/components/LoadingSpinner";
import UserEventsList from "~/components/UserEventsList";
import { api } from "~/utils/api";
import { ProfileMenu } from "../../components/ProfileMenu";
import SaveButton from "../../components/SaveButton";
import ShareButton from "../../components/ShareButton";

export default function Page() {
  const { user } = useUser();

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

  const saveButton = (event: RouterOutputs["event"]["getDiscover"][number]) => (
    <SaveButton eventId={event.id} isSaved={savedEventIds.has(event.id)} />
  );

  return (
    <View className="flex-1">
      <Stack.Screen
        options={{
          title: "Discover",
          headerTitle: "Discover",
          headerRight: () => (
            <View className="-mr-2 flex-row items-center gap-1">
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
          actionButton={saveButton}
          showCreator="always"
        />
      </View>
    </View>
  );
}
