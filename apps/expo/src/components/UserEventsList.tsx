import { Image, Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { FlashList } from "@shopify/flash-list";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import {
  formatRelativeTime,
  getDateTimeInfo,
  timeFormatDateInfo,
} from "~/utils/dates";

export function UserEventListItem(props: {
  event: RouterOutputs["event"]["getUpcomingForUser"][number];
  actionButton?: React.ReactNode;
  isLastItem?: boolean;
}) {
  const { event, actionButton, isLastItem } = props;
  const id = event.id;
  const e = event.event as AddToCalendarButtonPropsRestricted;

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

  return (
    <View
      className={`-mx-2 flex-row items-center rounded-lg bg-white p-4 px-6 ${
        relativeTime ? "pt-8" : ""
      } ${isLastItem ? "" : "border-b border-neutral-3"}`}
    >
      <View className="mr-4 flex-1">
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
            <Text
              className="mb-2 text-3xl font-bold text-neutral-1"
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {e.name}
            </Text>
          </Pressable>
        </Link>
        {e.location ? (
          <View className="flex-row items-center">
            <Text className="flex-1 text-sm text-neutral-2" numberOfLines={1}>
              {e.location}
            </Text>
          </View>
        ) : null}
      </View>
      <View className="relative flex items-center justify-center">
        {e.images?.[3] ? (
          <Image
            source={{ uri: e.images[3] }}
            className="h-20 w-20 rounded-md"
            resizeMode="cover"
          />
        ) : (
          <View className="h-20 w-20 rounded-md bg-accent-yellow" />
        )}
        {actionButton && (
          <View className="absolute -bottom-2 -right-2">{actionButton}</View>
        )}
      </View>
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
  actionButton?: (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
  ) => React.ReactNode;
}) {
  const { events, refreshControl, actionButton } = props;

  return (
    <FlashList
      data={events}
      estimatedItemSize={60}
      renderItem={({ item, index }) => (
        <UserEventListItem
          event={item}
          actionButton={actionButton ? actionButton(item) : undefined}
          isLastItem={index === events.length - 1}
        />
      )}
      refreshControl={refreshControl}
      ItemSeparatorComponent={() => <View className="h-2" />}
      ListHeaderComponent={<View className="h-2" />}
      contentContainerStyle={{ paddingBottom: 16 }}
    />
  );
}
