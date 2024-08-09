import { Image, Linking, Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Navigation2 } from "lucide-react-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import {
  formatRelativeTime,
  getDateTimeInfo,
  timeFormatDateInfo,
} from "~/utils/dates";

export function Event(props: {
  event: RouterOutputs["event"]["getUpcomingForUser"][number];
}) {
  const id = props.event.id;
  const e = props.event.event as AddToCalendarButtonPropsRestricted;

  const formatDate = (date: string, startTime?: string, endTime?: string) => {
    const startDateInfo = getDateTimeInfo(
      date,
      startTime || "",
      e.timeZone || "",
    );
    if (!startDateInfo) return { date: "", time: "" };

    const formattedDate = `${startDateInfo.dayOfWeek.substring(0, 3)}, ${startDateInfo.monthName} ${startDateInfo.day}`;
    const formattedStartTime = startTime
      ? timeFormatDateInfo(startDateInfo)
      : "";
    const formattedEndTime = endTime
      ? timeFormatDateInfo(
          getDateTimeInfo(date, endTime, e.timeZone || "") || startDateInfo,
        )
      : "";

    const timeRange =
      startTime && endTime
        ? `${formattedStartTime} - ${formattedEndTime}`
        : formattedStartTime;
    return { date: formattedDate, time: timeRange.trim() };
  };

  const { date, time } = formatDate(e.startDate || "", e.startTime, e.endTime);

  const dateInfo = getDateTimeInfo(
    e.startDate || "",
    e.startTime || "",
    e.timeZone || "",
  );
  const relativeTime = dateInfo ? formatRelativeTime(dateInfo) : "";

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
      {e.images?.[3] ? (
        <Image
          source={{ uri: e.images[3] }}
          className="mr-4 h-20 w-20 rounded-md"
          resizeMode="cover"
        />
      ) : (
        <View className="mr-4 h-20 w-20 rounded-md bg-accent-yellow" />
      )}
      <View className="flex-1">
        <View className="mb-2">
          <Text className="text-base font-medium text-neutral-2">
            {date} • {time}
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
        <View className="justify-center">
          <Pressable
            onPress={openGoogleMaps}
            className="flex-row items-center rounded-2xl bg-interactive-1 px-3 py-2"
          >
            <Navigation2 color="white" size={16} />
            <Text className="ml-1 text-2xl font-bold text-white">Go</Text>
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
