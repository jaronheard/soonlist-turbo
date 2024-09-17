import React from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { Link } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { FlashList } from "@shopify/flash-list";
import { Globe, Lock, MapPin, User } from "lucide-react-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import { useCalendar } from "~/hooks/useCalendar";
import { useAppStore } from "~/store";
import { api } from "~/utils/api";
import { cn } from "~/utils/cn";
import {
  formatRelativeTime,
  getDateTimeInfo,
  timeFormatDateInfo,
} from "~/utils/dates";
import { collapseSimilarEvents } from "~/utils/similarEvents";
import { CalendarSelectionModal } from "./CalendarSelectionModal";
import { EventMenu } from "./EventMenu";

type ShowCreatorOption = "always" | "otherUsers" | "never";

type Event = RouterOutputs["event"]["getDiscoverInfinite"]["events"][number];

interface ActionButtonProps {
  event: Event;
}

export function UserEventListItem(props: {
  event: Event;
  ActionButton?: React.ComponentType<ActionButtonProps>;
  isLastItem?: boolean;
  showCreator: ShowCreatorOption;
  isSaved: boolean;
}) {
  const { event, ActionButton, isLastItem, showCreator, isSaved } = props;
  const id = event.id;
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
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
  const isOver =
    dateInfo &&
    new Date() >
      new Date(
        dateInfo.year,
        dateInfo.month - 1,
        dateInfo.day,
        dateInfo.hour,
        dateInfo.minute,
      );
  const relativeTime = dateInfo && !isOver ? formatRelativeTime(dateInfo) : "";
  const isHappeningNow = relativeTime === "Happening now" && !isOver;

  const { user: currentUser } = useUser();
  const eventUser = event.user;

  // guard against null user
  if (!eventUser) return null;

  const isCurrentUser = currentUser?.id === eventUser.id;

  const shouldShowCreator =
    showCreator === "always" ||
    (showCreator === "otherUsers" && !isCurrentUser);

  const isOwner = isCurrentUser;

  return (
    <EventMenu
      event={event}
      isOwner={isOwner}
      isSaved={isSaved}
      menuType="context"
    >
      <Link
        href={{
          pathname: "/event/[id]",
          params: { id },
        }}
        asChild
      >
        <Pressable>
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
              <Text
                className="mb-2 text-3xl font-bold text-neutral-1"
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {e.name}
              </Text>
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
              {shouldShowCreator ? (
                <View className="flex-row items-center gap-2">
                  {eventUser.userImage ? (
                    <Image
                      source={{ uri: eventUser.userImage }}
                      className="h-4 w-4 rounded-full"
                    />
                  ) : (
                    <User size={16} color="#627496" />
                  )}
                  <Text className="text-sm text-neutral-2">
                    @{eventUser.username}
                  </Text>
                </View>
              ) : isOwner ? (
                <View className="flex-row items-center gap-2">
                  {event.visibility === "public" ? (
                    <Globe size={16} color="#627496" />
                  ) : (
                    <Lock size={16} color="#627496" />
                  )}
                  <Text className="text-sm text-neutral-2">
                    {event.visibility === "public"
                      ? "Your event is on Discover"
                      : "Your event is unlisted"}
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
              {ActionButton && (
                <View className="absolute -bottom-2 -right-2">
                  <ActionButton event={event} />
                </View>
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
        </Pressable>
      </Link>
    </EventMenu>
  );
}

export default function UserEventsList(props: {
  events: Event[];
  refreshControl?: React.ReactElement;
  ActionButton?: React.ComponentType<ActionButtonProps>;
  showCreator: ShowCreatorOption;
  isRefetching: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
  isFetchingNextPage: boolean;
}) {
  const {
    events,
    ActionButton,
    showCreator,
    isRefetching,
    onRefresh,
    onEndReached,
    isFetchingNextPage,
  } = props;
  const { user } = useUser();
  const username = user?.username || "";
  const {
    isCalendarModalVisible,
    setIsCalendarModalVisible,
    showAllCalendars,
    setShowAllCalendars,
  } = useAppStore();
  const { availableCalendars, handleCalendarSelect, INITIAL_CALENDAR_LIMIT } =
    useCalendar();

  const savedIdsQuery = api.event.getSavedIdsForUser.useQuery({
    userName: username,
  });

  // Collapse similar events
  const collapsedEvents = collapseSimilarEvents(events, user?.id);

  const renderEmptyState = () => (
    <View className="flex-1 justify-center px-6 py-10">
      <Text className="mb-4 text-center text-2xl font-bold text-neutral-1">
        Ready to start your Soonlist? 🎉
      </Text>
      <Text className="mb-6 text-center text-base text-neutral-2">
        Your feed is empty, but it's easy to add events! Let's get you started
        with capturing your first possibility.
      </Text>
      <View className="items-center">
        <Link href="/onboarding">
          <View className="rounded-full bg-interactive-1 px-6 py-3">
            <Text className="text-center text-base font-bold text-white">
              Learn how to add events
            </Text>
          </View>
        </Link>
      </View>
    </View>
  );

  const renderFooter = () =>
    isFetchingNextPage ? (
      <View className="py-4">
        <ActivityIndicator size="large" color="#5A32FB" />
      </View>
    ) : null;

  if (collapsedEvents.length === 0 && !isRefetching) {
    return renderEmptyState();
  }

  return (
    <>
      <FlashList
        data={collapsedEvents}
        estimatedItemSize={60}
        renderItem={({ item, index }) => {
          const isSaved =
            savedIdsQuery.data?.some(
              (savedEvent) => savedEvent.id === item.event.id,
            ) ?? false;

          return (
            <UserEventListItem
              event={item.event}
              ActionButton={ActionButton}
              isLastItem={index === collapsedEvents.length - 1}
              showCreator={showCreator}
              isSaved={isSaved}
            />
          );
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor="#5A32FB"
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.1}
        contentContainerStyle={{ paddingBottom: 16 }}
        ListFooterComponent={renderFooter()}
      />
      <CalendarSelectionModal
        visible={isCalendarModalVisible}
        calendars={availableCalendars}
        onSelect={handleCalendarSelect}
        onDismiss={() => setIsCalendarModalVisible(false)}
        showAllCalendars={showAllCalendars}
        setShowAllCalendars={setShowAllCalendars}
        initialLimit={INITIAL_CALENDAR_LIMIT}
      />
    </>
  );
}
