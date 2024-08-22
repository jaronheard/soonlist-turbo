import { Image, Linking, Pressable, Share, Text, View } from "react-native";
import ContextMenu from "react-native-context-menu-view";
import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { FlashList } from "@shopify/flash-list";
import { Globe, Lock, MapPin, User } from "lucide-react-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import { useCalendar } from "~/hooks/useCalendar";
import { api } from "~/utils/api";
import { cn } from "~/utils/cn";
import {
  formatRelativeTime,
  getDateTimeInfo,
  timeFormatDateInfo,
} from "~/utils/dates";
import { collapseSimilarEvents } from "~/utils/similarEvents";
import { CalendarSelectionModal } from "./CalendarSelectionModal";

type ShowCreatorOption = "always" | "otherUsers" | "never";

export function UserEventListItem(props: {
  event: RouterOutputs["event"]["getUpcomingForUser"][number];
  actionButton?: React.ReactNode;
  isLastItem?: boolean;
  showCreator: ShowCreatorOption;
  onEdit?: (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
  ) => void;
  onDelete?: (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
  ) => void;
  onFollow?: (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
  ) => void;
  onUnfollow?: (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
  ) => void;
  onShare?: (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
  ) => void;
  onAddToCal?: (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
  ) => void;
  onToggleVisibility?: (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
    newVisibility: "public" | "private",
  ) => void;
}) {
  const {
    event,
    actionButton,
    isLastItem,
    showCreator,
    onEdit,
    onDelete,
    onFollow,
    onUnfollow,
    onShare,
    onAddToCal,
    onToggleVisibility,
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

  const isCurrentUser =
    currentUser?.externalId === eventUser.id ||
    currentUser?.id === eventUser.id;

  const shouldShowCreator =
    showCreator === "always" ||
    (showCreator === "otherUsers" && !isCurrentUser);

  const isOwner = isCurrentUser;
  const isFollowing = event.eventFollows.find(
    (item) =>
      item.userId === user.id ||
      item.userId === currentUser?.id ||
      item.userId === currentUser?.externalId,
  );

  const getMenuItems = () => {
    const baseItems = [
      { title: "Share", systemIcon: "square.and.arrow.up" },
      { title: "Directions", systemIcon: "map" },
      { title: "Add to Calendar", systemIcon: "calendar.badge.plus" },
    ];

    if (isOwner) {
      return [
        ...baseItems,
        {
          title: event.visibility === "public" ? "Make Private" : "Make Public",
          systemIcon: event.visibility === "public" ? "lock" : "globe",
        },
        { title: "Edit", systemIcon: "square.and.pencil" },
        { title: "Delete", systemIcon: "trash", destructive: true },
      ];
    } else if (!isFollowing) {
      return [{ title: "Follow", systemIcon: "plus.circle" }, ...baseItems];
    } else {
      return [
        ...baseItems,
        { title: "Unfollow", systemIcon: "minus.circle", destructive: true },
      ];
    }
  };

  const handleDirections = (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
  ) => {
    const e = event.event as AddToCalendarButtonPropsRestricted;
    if (e.location) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(e.location)}`;
      void Linking.openURL(url);
    } else {
      console.log("No location available for directions");
    }
  };

  const handleMenuSelect = (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
    index: number,
  ) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const menuItems = getMenuItems();
    const selectedItem = menuItems[index];

    if (selectedItem) {
      switch (selectedItem.title) {
        case "Share":
          onShare?.(event);
          break;
        case "Directions":
          handleDirections(event);
          break;
        case "Add to Calendar":
          onAddToCal?.(event);
          break;
        case "Make Public":
        case "Make Private":
          const newVisibility =
            event.visibility === "public" ? "private" : "public";
          onToggleVisibility?.(event, newVisibility);
          break;
        case "Edit":
          onEdit?.(event);
          break;
        case "Delete":
          onDelete?.(event);
          break;
        case "Follow":
          onFollow?.(event);
          break;
        case "Unfollow":
          onUnfollow?.(event);
          break;
      }
    }
  };

  return (
    <ContextMenu
      actions={getMenuItems()}
      onPress={(e) => handleMenuSelect(event, e.nativeEvent.index)}
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
          {shouldShowCreator && (
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
  showCreator: ShowCreatorOption;
}) {
  const { events, refreshControl, actionButton, showCreator } = props;
  const { user } = useUser();
  const utils = api.useUtils();
  const {
    isCalendarModalVisible,
    setIsCalendarModalVisible,
    availableCalendars,
    handleAddToCal,
    handleCalendarSelect,
    showAllCalendars,
    setShowAllCalendars,
    INITIAL_CALENDAR_LIMIT,
  } = useCalendar();

  const deleteEventMutation = api.event.delete.useMutation({
    onSuccess: () => {
      void utils.event.invalidate();
    },
  });

  const unfollowEventMutation = api.event.unfollow.useMutation({
    onSuccess: () => {
      void utils.event.invalidate();
    },
  });

  const followEventMutation = api.event.follow.useMutation({
    onSuccess: () => {
      void utils.event.invalidate();
    },
  });

  const toggleVisibilityMutation = api.event.toggleVisibility.useMutation({
    onSuccess: () => {
      void utils.event.invalidate();
    },
  });

  const handleEdit = (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
  ) => {
    void Linking.openURL(
      `${process.env.EXPO_PUBLIC_API_BASE_URL}/event/${event.id}/edit`,
    );
  };

  const handleDelete = async (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
  ) => {
    await deleteEventMutation.mutateAsync({ id: event.id });
  };

  const handleUnfollow = async (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
  ) => {
    await unfollowEventMutation.mutateAsync({ id: event.id });
  };

  const handleFollow = async (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
  ) => {
    await followEventMutation.mutateAsync({ id: event.id });
  };

  const handleShare = async (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
  ) => {
    try {
      await Share.share({
        url: `${process.env.EXPO_PUBLIC_API_BASE_URL}/event/${event.id}`,
      });
    } catch (error) {
      console.error("Error sharing event:", error);
    }
  };

  const handleAddToCalWrapper = (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
  ) => {
    void handleAddToCal(event);
  };

  const handleCalendarSelectWrapper = (selectedCalendarId: string) => {
    void handleCalendarSelect(selectedCalendarId);
  };

  const handleToggleVisibility = async (
    event: RouterOutputs["event"]["getUpcomingForUser"][number],
    newVisibility: "public" | "private",
  ) => {
    await toggleVisibilityMutation.mutateAsync({
      id: event.id,
      visibility: newVisibility,
    });
  };

  // Collapse similar events
  const collapsedEvents = collapseSimilarEvents(
    events,
    user?.externalId || user?.id,
  );

  const renderFooter = () => (
    <View className="px-6 py-6">
      <Text className="text-center text-base font-medium text-neutral-2">
        End of events.{" "}
        <Link href="/onboarding" className="text-interactive-1">
          <Text className="font-bold text-interactive-1">Add your own!</Text>
        </Link>
      </Text>
    </View>
  );

  return (
    <>
      <FlashList
        data={collapsedEvents}
        estimatedItemSize={60}
        renderItem={({ item, index }) => (
          <UserEventListItem
            event={item.event}
            actionButton={actionButton ? actionButton(item.event) : undefined}
            isLastItem={index === collapsedEvents.length - 1}
            showCreator={showCreator}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onFollow={handleFollow}
            onUnfollow={handleUnfollow}
            onShare={handleShare}
            onAddToCal={handleAddToCalWrapper}
            onToggleVisibility={handleToggleVisibility}
          />
        )}
        refreshControl={refreshControl}
        contentContainerStyle={{ paddingBottom: 16 }}
        ListFooterComponent={renderFooter}
      />
      <CalendarSelectionModal
        visible={isCalendarModalVisible}
        calendars={availableCalendars}
        onSelect={handleCalendarSelectWrapper}
        onDismiss={() => setIsCalendarModalVisible(false)}
        showAllCalendars={showAllCalendars}
        setShowAllCalendars={setShowAllCalendars}
        initialLimit={INITIAL_CALENDAR_LIMIT}
      />
    </>
  );
}
