import { RefreshControl, View } from "react-native";
import { Stack } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

import SignInWithOAuth from "~/components/SignInWithOAuth";
import UserEventsList from "~/components/UserEventsList";
import { api } from "~/utils/api";

export default function Events() {
  // get user from clerk
  const { isLoaded, user } = useUser();

  // In case the user signs out while on the page.
  if (!isLoaded || !user?.username) {
    return <SignInWithOAuth />;
  }

  const eventsQuery = api.event.getUpcomingForUser.useQuery({
    userName: user.username,
  });
  const utils = api.useUtils();

  const onRefresh = () => {
    void utils.event.invalidate();
  };

  return (
    <View className="flex-1 pt-2">
      {/* Changes page title visible on the header */}
      <Stack.Screen options={{ title: "My Feed" }} />
      {eventsQuery.data && (
        <UserEventsList
          events={eventsQuery.data}
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
