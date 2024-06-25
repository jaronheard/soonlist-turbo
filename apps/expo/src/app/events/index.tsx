import { Pressable, SafeAreaView, Text, View } from "react-native";
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

  // const deletePostMutation = api.event.delete.useMutation({
  //   onSettled: () => utils.event.invalidate().then(),
  // });

  return (
    <SafeAreaView className="h-full w-full bg-background">
      {/* Changes page title visible on the header */}
      <Stack.Screen options={{ title: "My Feed" }} />
      <View className="h-full w-full bg-background p-4">
        <Pressable
          onPress={() => void utils.event.invalidate()}
          className="flex items-center rounded-lg bg-primary p-2"
        >
          <Text className="text-foreground"> Refresh events</Text>
        </Pressable>

        {eventsQuery.data && <UserEventsList events={eventsQuery.data} />}

        {/* <CreatePost /> */}
      </View>
    </SafeAreaView>
  );
}
