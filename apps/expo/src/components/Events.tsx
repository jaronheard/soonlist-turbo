import { RefreshControl, Share, TouchableOpacity, View } from "react-native";
import { Stack } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { ShareIcon } from "lucide-react-native";

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

  const events = eventsQuery.data ?? [];
  const currentAndFutureEvents = events.filter(
    (item) => item.startDateTime >= new Date(),
  );

  return (
    <View className="flex-1 pt-2">
      {/* Changes page title visible on the header */}
      <Stack.Screen
        options={{
          title: "My Feed",
          headerRight: () => (
            <TouchableOpacity
              onPress={async () => {
                const shareUrl = `${process.env.EXPO_PUBLIC_API_BASE_URL}/${user.username}/upcoming`;
                try {
                  await Share.share({
                    message: shareUrl,
                    url: shareUrl,
                  });
                } catch (error) {
                  console.error("Error sharing:", error);
                }
              }}
            >
              <ShareIcon size={24} color="#5A32FB" />
            </TouchableOpacity>
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
