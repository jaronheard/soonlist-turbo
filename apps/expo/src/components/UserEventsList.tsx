import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { EyeOff, Globe2, MapPin, User } from "lucide-react-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import { api } from "~/utils/api";
import { cn } from "~/utils/cn";
import {
  formatRelativeTime,
  getDateTimeInfo,
  isOver,
  timeFormatDateInfo,
} from "~/utils/dates";
import { collapseSimilarEvents } from "~/utils/similarEvents";
import { EventMenu } from "./EventMenu";
import { EventStats } from "./EventStats";
import { UserProfileFlair } from "./UserProfileFlair";

type ShowCreatorOption = "always" | "otherUsers" | "never";

type Event = RouterOutputs["event"]["getDiscoverInfinite"]["events"][number];

interface ActionButtonProps {
  event: Event;
}

function formatDate(
  date: string,
  startTime: string | undefined,
  endTime: string | undefined,
  timeZone: string,
) {
  const startDateInfo = getDateTimeInfo(date, startTime || "", timeZone);
  if (!startDateInfo) return { date: "", time: "" };

  const formattedDate = `${startDateInfo.dayOfWeek.substring(0, 3)}, ${startDateInfo.monthName} ${startDateInfo.day}`;
  const formattedStartTime = startTime ? timeFormatDateInfo(startDateInfo) : "";
  const formattedEndTime = endTime
    ? timeFormatDateInfo(
        getDateTimeInfo(date, endTime, timeZone) || startDateInfo,
      )
    : "";

  const timeRange =
    startTime && endTime
      ? `${formattedStartTime} - ${formattedEndTime}`
      : formattedStartTime;
  return { date: formattedDate, time: timeRange.trim() };
}

export function UserEventListItem(props: {
  event: Event;
  ActionButton?: React.ComponentType<ActionButtonProps>;
  isLastItem?: boolean;
  showCreator: ShowCreatorOption;
  isSaved: boolean;
}) {
  const { event, ActionButton, isLastItem, showCreator, isSaved } = props;
  const { fontScale } = useWindowDimensions();
  const id = event.id;
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const e = event.event as AddToCalendarButtonPropsRestricted;

  const { date, time } = useMemo(
    () =>
      formatDate(e.startDate || "", e.startTime, e.endTime, e.timeZone || ""),
    [e.startDate, e.startTime, e.endTime, e.timeZone],
  );

  const startDateInfo = useMemo(
    () =>
      getDateTimeInfo(e.startDate || "", e.startTime || "", e.timeZone || ""),
    [e.startDate, e.startTime, e.timeZone],
  );

  const endDateInfo = useMemo(
    () =>
      getDateTimeInfo(
        e.endDate || e.startDate || "",
        e.endTime || e.startTime || "",
        e.timeZone || "",
      ),
    [e.endDate, e.startDate, e.endTime, e.startTime, e.timeZone],
  );

  const eventIsOver = useMemo(() => {
    if (!endDateInfo) return false;
    return isOver(endDateInfo);
  }, [endDateInfo]);

  const relativeTime = useMemo(() => {
    if (!startDateInfo || eventIsOver) return "";
    return formatRelativeTime(startDateInfo);
  }, [startDateInfo, eventIsOver]);

  const isHappeningNow = relativeTime === "Happening now" && !eventIsOver;

  const { user: currentUser } = useUser();
  const eventUser = event.user;

  // guard against null user
  if (!eventUser) return null;

  const isCurrentUser = currentUser?.id === eventUser.id;

  const shouldShowCreator =
    showCreator === "always" ||
    (showCreator === "otherUsers" && !isCurrentUser);

  const isOwner = isCurrentUser;

  const iconSize = 16 * fontScale;
  const imageSize = 80 * fontScale;

  return (
    <EventMenu
      event={event}
      isOwner={isOwner}
      isSaved={isSaved}
      menuType="context"
    >
      <Link href={`/event/${id}`} asChild>
        <Pressable>
          <View
            className={cn(
              "-mx-2 flex-row items-center rounded-lg p-4 px-6",
              relativeTime ? "pt-12" : "pt-8",
              isLastItem ? "" : "border-b border-neutral-3",
              isHappeningNow ? "bg-accent-yellow" : "bg-white",
              "relative",
            )}
          >
            {isOwner && (
              <View className="absolute right-4 top-2 opacity-60">
                {event.visibility === "public" ? (
                  <Globe2 size={iconSize} color="#627496" />
                ) : (
                  <EyeOff size={iconSize} color="#627496" />
                )}
              </View>
            )}
            <View className="mr-4 flex-1">
              <View className="mb-2">
                <Text className="text-base font-medium text-neutral-2">
                  {date} • {time}
                </Text>
              </View>
              <Text
                className="mb-2 text-xl font-bold text-neutral-1"
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {e.name}
              </Text>
              {e.location ? (
                <View className="mb-2 flex-row items-center gap-1">
                  <MapPin size={iconSize} color="#627496" />
                  <Text
                    className="flex-1 text-base text-neutral-2"
                    numberOfLines={1}
                  >
                    {e.location}
                  </Text>
                </View>
              ) : null}
              {shouldShowCreator ? (
                <View className="flex-row items-center gap-2">
                  <UserProfileFlair username={eventUser.username} size="xs">
                    {eventUser.userImage ? (
                      <Image
                        source={{ uri: eventUser.userImage }}
                        style={{
                          width: iconSize,
                          height: iconSize,
                          borderRadius: 9999,
                        }}
                        contentFit="cover"
                        contentPosition="center"
                      />
                    ) : (
                      <User size={iconSize} color="#627496" />
                    )}
                  </UserProfileFlair>
                  <Text className="text-sm text-neutral-2">
                    @{eventUser.username}
                  </Text>
                </View>
              ) : null}
            </View>
            <View className="relative flex items-center justify-center">
              {e.images?.[3] ? (
                <Image
                  source={{
                    uri: `${e.images[3]}?w=160&h=160&fit=cover&f=webp&q=80`,
                  }}
                  style={{
                    width: imageSize,
                    height: imageSize,
                    borderRadius: 20,
                  }}
                  contentFit="cover"
                />
              ) : (
                <View
                  className="rounded-2xl bg-accent-yellow"
                  style={{
                    width: imageSize,
                    height: imageSize,
                  }}
                />
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
                    "rounded-full px-2 py-1",
                    isHappeningNow ? "bg-white" : "bg-accent-yellow",
                  )}
                >
                  <Text className="text-sm font-medium text-neutral-1">
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

interface UserEventsListProps {
  events: Event[];
  ActionButton?: React.ComponentType<ActionButtonProps>;
  showCreator: ShowCreatorOption;
  isRefetching: boolean;
  onRefresh: () => Promise<void>;
  onEndReached: () => void;
  isFetchingNextPage: boolean;
  stats?: {
    capturesThisWeek: number;
    weeklyGoal: number;
    upcomingEvents: number;
    allTimeEvents: number;
  };
}

export default function UserEventsList(props: UserEventsListProps) {
  const {
    events,
    ActionButton,
    showCreator,
    isRefetching,
    onRefresh,
    onEndReached,
    isFetchingNextPage,
    stats,
  } = props;
  const { user } = useUser();
  const username = user?.username || "";

  const savedIdsQuery = api.event.getSavedIdsForUser.useQuery({
    userName: username,
  });

  // Collapse similar events
  const collapsedEvents = collapseSimilarEvents(events, user?.id);

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center px-6 py-10">
      <Text className="mb-2 text-center text-2xl font-bold text-neutral-1">
        Capture an event
      </Text>
      <Text className="mb-6 text-center text-base text-neutral-2">
        Events you capture will show up in My Feed
      </Text>
    </View>
  );

  const renderFooter = () =>
    isFetchingNextPage ? (
      <View className="py-4">
        <ActivityIndicator size="large" color="#5A32FB" />
      </View>
    ) : null;

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isRefetching && isRefreshing) {
      setIsRefreshing(false);
    }
  }, [isRefetching, isRefreshing]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
  };

  const renderHeader = () => (stats ? <EventStats {...stats} /> : null);

  if (collapsedEvents.length === 0 && !isRefetching) {
    return renderEmptyState();
  }

  return (
    <>
      <FlatList
        data={collapsedEvents}
        // estimatedItemSize={60}
        ListHeaderComponent={renderHeader}
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
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#5A32FB"
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: 16 }}
        ListFooterComponent={renderFooter()}
      />
    </>
  );
}
