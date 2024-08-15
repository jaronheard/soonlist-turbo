import { Image, Pressable, Text, View } from "react-native";
import ContextMenu from "react-native-context-menu-view";
import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { FlashList } from "@shopify/flash-list";
import { MapPin, User } from "lucide-react-native"; // Add User icon

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
  actionButton?: React.ReactNode;
  isLastItem?: boolean;
  showCreator?: boolean;
  onEdit?: (eventId: string) => void;
  onDelete?: (eventId: string) => void;
  onRemove?: (eventId: string) => void;
  onShare?: (eventId: string) => void;
  onAddToCal?: (eventId: string) => void;
}) {
  const {
    event,
    actionButton,
    isLastItem,
    showCreator,
    onEdit,
    onDelete,
    onRemove,
    onShare,
    onAddToCal,
  } = props;
  const id = event.id;
  const e = event.event as AddToCalendarButtonPropsRestricted;
  const user = event.user;

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

  const { user: currentUser } = useUser();
  const eventUser = event.user;

  const isOwner = currentUser?.id === eventUser.id;

  const handleMenuPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const getMenuItems = () => {
    if (isOwner) {
      return [
        { title: "Edit", systemIcon: "square.and.pencil" },
        { title: "Share", systemIcon: "square.and.arrow.up" },
        { title: "Add to Calendar", systemIcon: "calendar.badge.plus" },
        { title: "Delete", systemIcon: "trash", destructive: true },
      ];
    } else {
      return [
        { title: "Share", systemIcon: "square.and.arrow.up" },
        { title: "Add to Calendar", systemIcon: "calendar.badge.plus" },
        { title: "Remove", systemIcon: "minus.circle", destructive: true },
      ];
    }
  };

  const handleMenuSelect = (eventId: string, index: number) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (isOwner) {
      switch (index) {
        case 0:
          onEdit?.(eventId);
          break;
        case 1:
          onShare?.(eventId);
          break;
        case 2:
          onAddToCal?.(eventId);
          break;
        case 3:
          onDelete?.(eventId);
          break;
      }
    } else {
      switch (index) {
        case 0:
          onShare?.(eventId);
          break;
        case 1:
          onAddToCal?.(eventId);
          break;
        case 2:
          onRemove?.(eventId);
          break;
      }
    }
  };

  return (
    <ContextMenu
      onPress={handleMenuPress}
      actions={getMenuItems()}
      onPress={(e) => handleMenuSelect(id, e.nativeEvent.index)}
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
            <Pressable onLongPress={() => null}>
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
              <Text className="flex-1 text-sm text-neutral-2" numberOfLines={1}>
                {e.location}
              </Text>
            </View>
          ) : null}
          {showCreator && (
            <View className="flex-row items-center gap-2">
              {user.userImage ? (
                <Image
                  source={{ uri: user.userImage }}
                  className="h-4 w-4 rounded-full"
                />
              ) : (
                <User size={16} color="#627496" />
              )}
              <Text className="text-sm text-neutral-2">@{user.username}</Text>
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
          {actionButton && (
            <View className="absolute -bottom-2 -right-2">{actionButton}</View>
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
    </ContextMenu>
  );
}

export default function UserEventsList(props: {
  events: RouterOutputs["event"]["getUpcomingForUser"];
  refreshControl?: React.ReactElement;
  actionButton?: (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
  ) => React.ReactNode;
  showCreator?: boolean;
  onEdit?: (eventId: string) => void;
  onDelete?: (eventId: string) => void;
  onRemove?: (eventId: string) => void;
  onShare?: (eventId: string) => void;
  onAddToCal?: (eventId: string) => void;
}) {
  const {
    events,
    refreshControl,
    actionButton,
    showCreator,
    onEdit,
    onDelete,
    onRemove,
    onShare,
    onAddToCal,
  } = props;
  const { user } = useUser();

  // Collapse similar events
  const collapsedEvents = collapseSimilarEvents(
    events,
    user?.externalId || user?.id,
  );

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
          actionButton={actionButton ? actionButton(item.event) : undefined}
          isLastItem={index === collapsedEvents.length - 1}
          showCreator={showCreator}
          onEdit={onEdit}
          onDelete={onDelete}
          onRemove={onRemove}
          onShare={onShare}
          onAddToCal={onAddToCal}
        />
      )}
      refreshControl={refreshControl}
      contentContainerStyle={{ paddingBottom: 16 }}
      ListFooterComponent={renderFooter}
    />
  );
}
