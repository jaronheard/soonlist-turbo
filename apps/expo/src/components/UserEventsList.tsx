import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { FlashList } from "@shopify/flash-list";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import { api } from "~/utils/api";

export function Event(props: {
  event: RouterOutputs["event"]["getUpcomingForUser"][number];
}) {
  const utils = api.useUtils();
  const deleteEventMutation = api.event.delete.useMutation({
    onSettled: () => void utils.event.invalidate(),
  });
  const id = props.event.id;
  const e = props.event.event as AddToCalendarButtonPropsRestricted;
  return (
    <View className="flex flex-col rounded-lg bg-muted p-4">
      <View className="flex-grow">
        <Link
          asChild
          href={{
            pathname: "/event/[id]",
            params: { id },
          }}
        >
          <Pressable className="">
            <Text className=" text-xl font-semibold text-primary">
              {e.name}
            </Text>
            <Text className="mt-2 text-foreground">{e.description}</Text>
          </Pressable>
        </Link>
      </View>
      <Pressable
        onPress={() => deleteEventMutation.mutate({ id })}
        className="mt-4 self-end"
      >
        <Text className="text-red-500">Delete</Text>
      </Pressable>
    </View>
  );
}

export default function UserEventsList(props: {
  events: RouterOutputs["event"]["getUpcomingForUser"];
}) {
  const { events } = props;

  return (
    <FlashList
      data={events}
      estimatedItemSize={60}
      ItemSeparatorComponent={() => <View className="h-2" />}
      renderItem={(events) => <Event event={events.item} />}
    />
  );
}
