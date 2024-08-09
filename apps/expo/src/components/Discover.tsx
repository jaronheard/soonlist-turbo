import { RefreshControl, View } from "react-native";
import { Stack } from "expo-router";
import { SignedIn, useUser } from "@clerk/clerk-expo";

import SignInWithOAuth from "~/components/SignInWithOAuth";
import UserEventsList from "~/components/UserEventsList";
import { api } from "~/utils/api";
import { ProfileMenu } from "./ProfileMenu";
import ShareButton from "./ShareButton";

export default function Discover() {
  // get user from clerk
  const { isLoaded, user } = useUser();

  // In case the user signs out while on the page.
  if (!isLoaded || !user?.username) {
    return <SignInWithOAuth />;
  }

  const eventsQuery = api.event.getNext.useQuery({
    limit: 50,
  });
  const utils = api.useUtils();

  const onRefresh = () => {
    void utils.event.invalidate();
  };

  const events = eventsQuery.data ?? [];
  const currentAndFutureEvents = events.filter(
    (item) => item.startDateTime >= new Date(),
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
      {eventsQuery.data && (
        <UserEventsList
          events={currentAndFutureEvents}
          refreshControl={
            <RefreshControl
              refreshing={eventsQuery.isRefetching}
              onRefresh={onRefresh}
            />
          }
        />
      )}
    </View>
  );
}
