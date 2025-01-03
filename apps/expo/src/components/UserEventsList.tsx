import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { Image } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import { Link, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import {
  Copy,
  EyeOff,
  Globe2,
  MapPin,
  PlusCircle,
  User,
} from "lucide-react-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import { useAppStore } from "~/store";
import { api } from "~/utils/api";
import { cn } from "~/utils/cn";
import {
  formatRelativeTime,
  getDateTimeInfo,
  isOver,
  timeFormatDateInfo,
} from "~/utils/dates";
import { collapseSimilarEvents } from "~/utils/similarEvents";
import { EventListItemSkeleton } from "./EventListItemSkeleton";
import { EventMenu } from "./EventMenu";
import { EventStats } from "./EventStats";
import { UserProfileFlair } from "./UserProfileFlair";

type ShowCreatorOption = "always" | "otherUsers" | "never";

type Event = RouterOutputs["event"]["getDiscoverInfinite"]["events"][number];

interface ActionButtonProps {
  event: Event;
}

interface PromoCardProps {
  type: "addEvents";
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
  similarEventsCount?: number;
}) {
  const {
    event,
    ActionButton,
    isLastItem,
    showCreator,
    isSaved,
    similarEventsCount,
  } = props;
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
              <View className="absolute right-4 top-2 flex-row items-center gap-2 opacity-60">
                {similarEventsCount ? (
                  <View className="bg-neutral-5/90 flex-row items-center gap-1 rounded-full px-1">
                    <Copy size={12} color="#627496" />
                    <Text className="text-xs text-neutral-2">
                      {similarEventsCount}
                    </Text>
                  </View>
                ) : null}
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

function PromoCard({ type }: PromoCardProps) {
  const router = useRouter();
  const { fontScale } = useWindowDimensions();

  const handlePress = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      useAppStore.setState({
        hasMediaPermission: status === MediaLibrary.PermissionStatus.GRANTED,
      });
    } catch (error) {
      console.error("Error requesting media permissions:", error);
    }
    router.push("/new");
  };

  if (type === "addEvents") {
    return (
      <TouchableOpacity onPress={handlePress}>
        <View className="mx-4 rounded-2xl bg-accent-yellow/80 p-4">
          <Text className="mb-1 text-lg font-semibold text-neutral-1">
            Keep capturing
          </Text>
          <Text className="text-base text-neutral-2">
            Fill your list with possibilities. Tap{" "}
            <PlusCircle size={16 * fontScale} color="#4B5563" /> to add more.
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return null;
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
  promoCard?: PromoCardProps;
  isAddingEvent?: boolean;
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
    promoCard,
    isAddingEvent,
  } = props;
  const { user } = useUser();
  const username = user?.username || "";

  const savedIdsQuery = api.event.getSavedIdsForUser.useQuery({
    userName: username,
  });

  // Collapse similar events
  const collapsedEvents = collapseSimilarEvents(events, user?.id);

  const renderEmptyState = () => {
    if (isAddingEvent) {
      return (
        <View className="flex-1">
          {stats && <EventStats {...stats} />}
          <EventListItemSkeleton />
        </View>
      );
    }

    return (
      <View className="mb-16 flex-1 items-center justify-center px-6 py-10">
        <Image
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          source={require("../assets/icon.png")}
          style={{
            width: 64,
            height: 64,
            marginBottom: 16,
            borderRadius: 8,
          }}
          contentFit="contain"
        />
        <Text className="mb-2 rounded-lg text-center text-2xl font-bold text-neutral-1">
          Start capturing
        </Text>
        <Text className="mb-6 text-center text-base text-neutral-2">
          Create your personal list of possibilities.{"\n"}
          Tap the plus button to get started.
        </Text>
      </View>
    );
  };

  const renderFooter = () => (
    <>
      {isFetchingNextPage ? (
        <View className="py-4">
          <ActivityIndicator size="large" color="#5A32FB" />
        </View>
      ) : null}
      {events.length >= 1 && promoCard ? (
        <View className="mb-4 mt-2">
          <PromoCard {...promoCard} />
        </View>
      ) : null}
    </>
  );

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

  if (collapsedEvents.length === 0) {
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

          const similarEventsCount = item.similarEvents.length;

          return (
            <UserEventListItem
              event={item.event}
              ActionButton={ActionButton}
              isLastItem={index === collapsedEvents.length - 1}
              showCreator={showCreator}
              isSaved={isSaved}
              similarEventsCount={
                similarEventsCount > 0 ? similarEventsCount : undefined
              }
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
        contentContainerStyle={{
          paddingBottom: 120, // Increased padding to account for AddEventButton
        }}
        ListFooterComponent={renderFooter()}
      />
    </>
  );
}
