import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { FlashList } from "@shopify/flash-list";

import type { RouterOutputs } from "~/utils/api";

export function Event(props: {
  event: RouterOutputs["event"]["getForUser"][number];
  // onDelete: () => void;
}) {
  return (
    <View className="flex flex-row rounded-lg bg-muted p-4">
      <View className="flex-grow">
        <Link
          asChild
          href={{
            pathname: "/events/[id]",
            params: { id: props.event.id },
          }}
        >
          <Pressable className="">
            <Text className=" text-xl font-semibold text-primary">
              {props.event.event?.name}
            </Text>
            <Text className="mt-2 text-foreground">
              {props.event.event?.description}
            </Text>
          </Pressable>
        </Link>
      </View>
      {/* <Pressable onPress={props.onDelete}>
        <Text className="font-bold uppercase text-primary">Delete</Text>
      </Pressable> */}
    </View>
  );
}

export default function UserEventsList(props: {
  events: RouterOutputs["event"]["getForUser"];
}) {
  return (
    <FlashList
      data={props.events}
      estimatedItemSize={20}
      ItemSeparatorComponent={() => <View className="h-2" />}
      renderItem={(post) => <Event event={post.item} />}
    />
  );
}
