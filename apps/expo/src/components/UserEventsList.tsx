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

  const formatDate = (date: string, startTime?: string, endTime?: string) => {
    const d = new Date(date);
    const formattedDate = d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const timeRange =
      startTime && endTime ? `${startTime} - ${endTime}` : startTime || "";
    return `${formattedDate} ${timeRange}`.trim();
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

  const openGoogleMaps = () => {
    if (e.location) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(e.location)}`;
      void Linking.openURL(url);
    }
  };

  return (
    <View
      className={`flex-row rounded-lg bg-white p-4 ${relativeTime ? "pt-8" : ""}`}
    >
      <Image
        source={{ uri: e.images?.[3] ?? "" }}
        className="mr-4 h-20 w-20 rounded-md"
        resizeMode="cover"
      />
      <View className="flex-1">
        <View className="mb-2">
          <Text className="text-base font-medium text-neutral-2">
            {formatDate(e.startDate || "", e.startTime, e.endTime)}
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
            <Text className="mb-2 text-3xl font-bold text-neutral-1">
              {e.name}
            </Text>
          </Pressable>
        </Link>
        {e.location && (
          <View className="flex-row items-center">
            <Text className="flex-1 text-sm text-neutral-2" numberOfLines={1}>
              {e.location}
            </Text>
          </View>
        )}
      </View>
      {relativeTime && (
        <View className="ml-2 justify-center">
          <Pressable
            onPress={openGoogleMaps}
            className="rounded-xl bg-interactive-1 px-4 py-2"
          >
            <Text className="text-2xl font-bold text-white">Go</Text>
          </Pressable>
        </View>
      )}
      {relativeTime && (
        <View className="absolute left-0 right-0 top-0 flex items-center justify-center">
          <View className="rounded-full bg-accent-yellow px-2 py-1">
            <Text className="text-sm font-medium text-black">
              {relativeTime}
            </Text>
          </View>
        </View>
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
      renderItem={(events) => <Event event={events.item} />}
      refreshControl={refreshControl}
    />
  );
}
