import { Animated, Image, Pressable, Text, View } from "react-native";
import { LongPressGestureHandler, State } from "react-native-gesture-handler";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { Link } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useActionSheet } from "@expo/react-native-action-sheet";
import { FlashList } from "@shopify/flash-list";
import {
  Calendar,
  Edit,
  MapPin,
  Share,
  Trash,
  User,
} from "lucide-react-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import { cn } from "~/utils/cn"; // Make sure to import the cn function

import {
  formatRelativeTime,
  getDateTimeInfo,
  timeFormatDateInfo,
} from "~/utils/dates";
import { collapseSimilarEvents } from "~/utils/similarEvents";

export function UserEventListItem(props: {
  event: RouterOutputs["event"]["getUpcomingForUser"][number];
  isLastItem?: boolean;
  showCreator?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onAddToCal?: () => void;
  onRemove?: () => void;
  onLongPress?: () => void;
}) {
  const {
    event,
    isLastItem,
    showCreator,
    onEdit,
    onDelete,
    onShare,
    onAddToCal,
    onRemove,
    onLongPress,
  } = props;
  const { user } = useUser();
  const isOwner = user?.id === event.user.id;

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
  const isHappeningNow = relativeTime === "Happening now";

  const renderLeftActions = () => {
    return (
      <View className="flex-row">
        {onRemove && (
          <Pressable
            onPress={onRemove}
            className="justify-center bg-red-500 px-4"
          >
            <Trash size={24} color="white" />
            <Text className="text-white">Remove</Text>
          </Pressable>
        )}
        {onShare && (
          <Pressable
            onPress={onShare}
            className="justify-center bg-green-500 px-4"
          >
            <Share size={24} color="white" />
            <Text className="text-white">Share</Text>
          </Pressable>
        )}
        {onAddToCal && (
          <Pressable
            onPress={onAddToCal}
            className="justify-center bg-purple-500 px-4"
          >
            <Calendar size={24} color="white" />
            <Text className="text-white">Add to Cal</Text>
          </Pressable>
        )}
      </View>
    );
  };

  const renderRightActions = () => {
    return (
      <View className="flex-row">
        {isOwner && onEdit && (
          <Pressable
            onPress={onEdit}
            className="justify-center bg-blue-500 px-4"
          >
            <Edit size={24} color="white" />
            <Text className="text-white">Edit</Text>
          </Pressable>
        )}
        {isOwner && onDelete && (
          <Pressable
            onPress={onDelete}
            className="justify-center bg-red-500 px-4"
          >
            <Trash size={24} color="white" />
            <Text className="text-white">Delete</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <Swipeable
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
      leftThreshold={30}
      rightThreshold={40}
    >
      <LongPressGestureHandler
        onHandlerStateChange={({ nativeEvent }) => {
          if (nativeEvent.state === State.ACTIVE) {
            onLongPress?.();
          }
        }}
        minDurationMs={800}
      >
        <View
          className={cn(
            "relative -mx-2 flex-row items-center rounded-lg p-4 px-6 pt-6",
            relativeTime ? "pt-10" : "",
            isLastItem ? "" : "border-b border-neutral-3",
            isHappeningNow ? "bg-accent-yellow" : "bg-white",
          )}
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
              <View className="mb-2 flex-row items-center gap-0.5">
                <MapPin size={10} color="#627496" />
                <Text
                  className="flex-1 text-sm text-neutral-2"
                  numberOfLines={1}
                >
                  {e.location}
                </Text>
              </View>
            ) : null}
            {showCreator && (
              <View className="flex-row items-center gap-2">
                {event.user.userImage ? (
                  <Image
                    source={{ uri: event.user.userImage }}
                    className="h-4 w-4 rounded-full"
                  />
                ) : (
                  <User size={16} color="#627496" />
                )}
                <Text className="text-sm text-neutral-2">
                  @{event.user.username}
                </Text>
              </View>
            )}
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
          </View>
          {relativeTime && (
            <View className="absolute left-0 right-0 top-2 flex items-center justify-center">
              <View
                className={cn(
                  "rounded-full bg-accent-yellow px-2 py-1",
                  isHappeningNow ? "bg-white" : "bg-accent-yellow",
                )}
              >
                <Text className={cn("text-sm font-medium text-neutral-1")}>
                  {relativeTime}
                </Text>
              </View>
            </View>
          )}
        </View>
      </LongPressGestureHandler>
    </Swipeable>
  );
}

export default function UserEventsList(props: {
  events: RouterOutputs["event"]["getUpcomingForUser"];
  refreshControl?: React.ReactElement;
  showCreator?: boolean;
  onEdit?: (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
  ) => void;
  onDelete?: (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
  ) => void;
  onShare?: (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
  ) => void;
  onAddToCal?: (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
  ) => void;
  onRemove?: (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
  ) => void;
  onLongPress?: (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
  ) => void;
}) {
  const {
    events,
    refreshControl,
    showCreator,
    onEdit,
    onDelete,
    onShare,
    onAddToCal,
    onRemove,
    onLongPress,
  } = props;
  const { user } = useUser();
  const { showActionSheetWithOptions } = useActionSheet();

  // Collapse similar events
  const collapsedEvents = collapseSimilarEvents(
    events,
    user?.externalId || user?.id,
  );

  const handleLongPress = (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
  ) => {
    const isOwner = user?.id === event.user.id;
    const options = isOwner
      ? ["Edit", "Delete", "Share", "Add to Calendar", "Cancel"]
      : ["Remove", "Share", "Add to Calendar", "Cancel"];
    const destructiveButtonIndex = isOwner ? 1 : 0;
    const cancelButtonIndex = options.length - 1;

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        destructiveButtonIndex,
      },
      (selectedIndex) => {
        if (selectedIndex === cancelButtonIndex) {
          return;
        }

        const selectedOption = options[selectedIndex!];
        switch (selectedOption) {
          case "Edit":
            onEdit?.(event);
            break;
          case "Delete":
            onDelete?.(event);
            break;
          case "Remove":
            onRemove?.(event);
            break;
          case "Share":
            onShare?.(event);
            break;
          case "Add to Calendar":
            onAddToCal?.(event);
            break;
        }
      },
    );
  };

  const renderFooter = () => (
    <View className="px-6 py-6">
      <Text className="text-center text-base font-medium text-neutral-2">
        End of events. Add your own!
      </Text>
    </View>
  );

  return (
    <FlashList
      data={collapsedEvents}
      estimatedItemSize={60}
      renderItem={({ item, index }) => (
        <UserEventListItem
          event={item.event}
          isLastItem={index === collapsedEvents.length - 1}
          showCreator={showCreator}
          onEdit={() => onEdit?.(item.event)}
          onDelete={() => onDelete?.(item.event)}
          onShare={() => onShare?.(item.event)}
          onAddToCal={() => onAddToCal?.(item.event)}
          onRemove={() => onRemove?.(item.event)}
          onLongPress={() => handleLongPress(item.event)}
        />
      )}
      refreshControl={refreshControl}
      contentContainerStyle={{ paddingBottom: 16 }}
      ListFooterComponent={renderFooter}
    />
  );
}
