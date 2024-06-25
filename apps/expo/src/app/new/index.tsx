import { Pressable, SafeAreaView, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { FlashList } from "@shopify/flash-list";

import type { RouterOutputs } from "~/utils/api";
import SignInWithOAuth from "~/components/SignInWithOAuth";
import { api } from "~/utils/api";

export function List(props: {
  list: RouterOutputs["list"]["getAllForUser"][number];
  // onDelete: () => void;
}) {
  return <Text>{props.list.name}</Text>;
}

export function UsersListsList(props: {
  lists: RouterOutputs["list"]["getAllForUser"];
}) {
  return (
    <FlashList
      data={props.lists}
      estimatedItemSize={20}
      ItemSeparatorComponent={() => <View className="h-2" />}
      renderItem={(list) => <List list={list.item} />}
    />
  );
}

export default function Page() {
  // get user from clerk
  const { isLoaded, user } = useUser();

  // In case the user signs out while on the page.
  if (!isLoaded || !user?.username) {
    return <SignInWithOAuth />;
  }

  const listsQuery = api.list.getAllForUser.useQuery({
    userName: user.username,
  });
  const utils = api.useUtils();

  return (
    <SafeAreaView className=" bg-background">
      {/* Changes page title visible on the header */}
      <Stack.Screen options={{ title: "Choose List" }} />
      <View className="h-full w-full bg-background p-4">
        <Pressable
          onPress={() => void utils.event.invalidate()}
          className="flex items-center rounded-lg bg-primary p-2"
        >
          <Text className="text-foreground"> Refresh list</Text>
        </Pressable>

        {listsQuery.data && <UsersListsList lists={listsQuery.data} />}

        {/* <CreatePost /> */}
      </View>
    </SafeAreaView>
  );
}
