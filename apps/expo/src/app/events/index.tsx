import { Pressable, SafeAreaView, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

import SignInWithOAuth from "~/components/SignInWithOAuth";
import UserEventsList from "~/components/UserEventsList";
import { api } from "~/utils/api";

export default function Index() {
  // get user from clerk
  const { isLoaded, user } = useUser();

  // In case the user signs out while on the page.
  if (!isLoaded || !user?.username) {
    return <SignInWithOAuth />;
  }

  const eventsQuery = api.event.getForUser.useQuery({
    userName: user.username,
  });
  const utils = api.useUtils();

  // const deletePostMutation = api.event.delete.useMutation({
  //   onSettled: () => utils.event.invalidate().then(),
  // });

  return (
    <SafeAreaView className=" bg-background">
      {/* Changes page title visible on the header */}
      <Stack.Screen options={{ title: "Home Page" }} />
      <View className="h-full w-full bg-background p-4">
        <Text className="pb-2 text-center text-5xl font-bold text-foreground">
          Create <Text className="text-primary">T3</Text> Turbo
        </Text>

        <Pressable
          onPress={() => void utils.event.invalidate()}
          className="flex items-center rounded-lg bg-primary p-2"
        >
          <Text className="text-foreground"> Refresh events</Text>
        </Pressable>

        <View className="py-2">
          <Text className="font-semibold italic text-primary">
            Press on a event
          </Text>
        </View>

        {eventsQuery.data && <UserEventsList events={eventsQuery.data} />}

        {/* <CreatePost /> */}
      </View>
    </SafeAreaView>
  );
}
