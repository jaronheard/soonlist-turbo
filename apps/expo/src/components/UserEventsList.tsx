import { Image, Linking, Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { MapPin } from "lucide-react-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";

export function Event(props: {
  event: RouterOutputs["event"]["getUpcomingForUser"][number];
}) {
  const id = props.event.id;
  const e = props.event.event as AddToCalendarButtonPropsRestricted;

  const formatDate = (date: string, time?: string) => {
    const d = new Date(date);
    return `${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} ${time || ""}`.trim();
  };

  const formatRelativeTime = (dateInfo: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  }): string => {
    const now = new Date();
    const startDate = new Date(
      dateInfo.year,
      dateInfo.month - 1,
      dateInfo.day,
      dateInfo.hour,
      dateInfo.minute,
    );
    const difference = startDate.getTime() - now.getTime();
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor(difference / (1000 * 60));

    const isSameDay = dateInfo.day === now.getDate();
    const isSameMonth = dateInfo.month - 1 === now.getMonth();
    const isSameYear = dateInfo.year === now.getFullYear();
    const isToday = isSameDay && isSameMonth && isSameYear;
    const isTomorrow =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      ).getDate() === startDate.getDate();

    if (difference < 0) {
      return "in the past";
    }

    if (days === 0 && hours === 0) {
      return `Starts in ${minutes} minute${minutes === 1 ? "" : "s"}`;
    }
    if (days === 0 && hours < 1) {
      return `Starts in ${hours} hour${hours === 1 ? "" : "s"} ${minutes} minute${minutes === 1 ? "" : "s"}`;
    }
    if (isToday) {
      return `Starts in ~${hours} hour${hours === 1 ? "" : "s"}`;
    }
    if (isTomorrow) {
      return `Tomorrow`;
    }
    return ``;
  };

  const relativeTime = formatRelativeTime({
    year: new Date(e.startDate || "").getFullYear(),
    month: new Date(e.startDate || "").getMonth() + 1,
    day: new Date(e.startDate || "").getDate(),
    hour: parseInt(e.startTime?.split(":")[0] || "0", 10),
    minute: parseInt(e.startTime?.split(":")[1] || "0", 10),
  });

  return (
    <View className="flex-col rounded-lg bg-white p-4 shadow-sm">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm font-medium text-neutral-2">
          {formatDate(e.startDate || "", e.startTime)}
        </Text>
        <Text className="text-sm font-medium text-yellow-500">
          {relativeTime}
        </Text>
      </View>
      <Link
        asChild
        href={{
          pathname: "/event/[id]",
          params: { id },
        }}
      >
        <Pressable>
          <Text className="mb-1 text-xl font-bold text-neutral-1">
            {e.name}
          </Text>
          {e.location && (
            <View className="flex-row items-center">
              <MapPin className="mr-1 size-4 text-neutral-2" />
              <Text className="text-sm text-neutral-2">{e.location}</Text>
            </View>
          )}
        </Pressable>
      </Link>
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
