import { RefreshControl, View } from "react-native";
import { Stack } from "expo-router";
import { SignedIn, useUser } from "@clerk/clerk-expo";

import type { RouterOutputs } from "~/utils/api";
import SignInWithOAuth from "~/components/SignInWithOAuth";
import UserEventsList from "~/components/UserEventsList";
import { api } from "~/utils/api";
import { ProfileMenu } from "./ProfileMenu";
import SaveButton from "./SaveButton";
import ShareButton from "./ShareButton";

export default function Discover() {
  const { isLoaded, user } = useUser();

  if (!isLoaded || !user?.username) {
    return <SignInWithOAuth />;
  }

  const eventsQuery = api.event.getDiscover.useQuery({
    limit: 50,
  });
  const savedEventsQuery = api.event.getSavedForUser.useQuery({
    userName: user.username,
  });
  const utils = api.useUtils();

  const onRefresh = () => {
    void utils.event.invalidate();
  };

  const events = eventsQuery.data ?? [];
  const currentAndFutureEvents = events.filter(
    (item) => item.startDateTime >= new Date(),
  );

  const savedEventIds = new Set(
    savedEventsQuery.data?.map((event) => event.id),
  );

  const saveButton = (event: RouterOutputs["event"]["getDiscover"][number]) => (
    <SaveButton eventId={event.id} isSaved={savedEventIds.has(event.id)} />
  );

  return (
    <View className="flex-1 pt-2">
      <Stack.Screen
        options={{
          title: "Discover",
          headerRight: () => (
            <View className="flex-row items-center gap-2">
              <SignedIn>
                <ShareButton webPath={`/explore`} />
              </SignedIn>
              <ProfileMenu />
            </View>
          ),
        }}
      />
      {eventsQuery.data ? (
        <UserEventsList
          events={currentAndFutureEvents}
          refreshControl={
            <RefreshControl
              refreshing={eventsQuery.isRefetching}
              onRefresh={onRefresh}
            />
          }
          actionButton={saveButton}
        />
      ) : null}
    </View>
  );
}
