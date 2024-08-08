import { Image, Linking, Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { FlashList } from "@shopify/flash-list";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";

export function Event(props: {
  event: RouterOutputs["event"]["getUpcomingForUser"][number];
}) {
  const id = props.event.id;
  const e = props.event.event as AddToCalendarButtonPropsRestricted;

  const formatDate = (date: string, time?: string) => {
    const d = new Date(date);
    return `${d.toLocaleDateString()} ${time || ""}`.trim();
  };

  const openMapsWithDirections = async () => {
    if (e.location) {
      const encodedLocation = encodeURIComponent(e.location);
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodedLocation}`;
      try {
        await Linking.openURL(url);
      } catch (error) {
        console.error("Failed to open URL:", error);
      }
    }
  };

  return (
    <View className="flex-row items-center rounded-lg bg-muted p-3">
      {e.images && e.images.length > 0 && (
        <Image
          source={{ uri: Array.isArray(e.images) ? e.images[0] : e.images }}
          style={{ width: 50, height: 50, marginRight: 10 }}
          className="rounded-md"
        />
      )}
      <View className="flex-1">
        <Link
          asChild
          href={{
            pathname: "/event/[id]",
            params: { id },
          }}
        >
          <Pressable>
            <Text className="text-lg font-semibold text-primary">{e.name}</Text>
            <Text className="text-sm text-foreground">
              {formatDate(e.startDate || "", e.startTime)}
              {e.endDate && ` - ${formatDate(e.endDate, e.endTime)}`}
            </Text>
            {e.location && (
              <Text className="text-sm text-foreground">{e.location}</Text>
            )}
          </Pressable>
        </Link>
      </View>
      {e.location && (
        <Pressable
          onPress={openMapsWithDirections}
          className="ml-2 rounded-md bg-interactive-1 px-4 py-2"
        >
          <Text className="text-lg font-bold text-white">Go</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function UserEventsList(props: {
  events: RouterOutputs["event"]["getUpcomingForUser"];
  refreshControl?: React.ReactElement;
}) {
  const { events, refreshControl } = props;

  return (
    <FlashList
      data={events}
      estimatedItemSize={60}
      ItemSeparatorComponent={() => <View className="h-2" />}
      renderItem={(events) => <Event event={events.item} />}
      refreshControl={refreshControl}
    />
  );
}
