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
  const savedEventIdsQuery = api.event.getSavedIdsForUser.useQuery({
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
      {!isLoaded || !user.username ? (
        <SignInWithOAuth />
      ) : (
        <View className="flex-1">
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
        </View>
      )}
    </View>
  );
}
