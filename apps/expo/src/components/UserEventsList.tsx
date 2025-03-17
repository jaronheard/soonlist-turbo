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
import { Image } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { LegendList } from "@legendapp/list";
import { useMutationState, useQueryClient } from "@tanstack/react-query";
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
  formatEventDateRange,
  formatRelativeTime,
  getDateTimeInfo,
  isOver,
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

export function UserEventListItem(props: {
  event: Event;
  ActionButton?: React.ComponentType<ActionButtonProps>;
  isLastItem?: boolean;
  showCreator: ShowCreatorOption;
  isSaved: boolean;
  similarEventsCount?: number;
  demoMode?: boolean;
}) {
  const {
    event,
    ActionButton,
    isLastItem,
    showCreator,
    isSaved,
    similarEventsCount,
    demoMode,
  } = props;
  const { fontScale } = useWindowDimensions();
  const id = event.id;
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const e = event.event as AddToCalendarButtonPropsRestricted;

  const dateString = formatEventDateRange(
    e.startDate || "",
    e.startTime,
    e.endTime,
    e.timeZone || "",
  );

  const startDateInfo = useMemo(
    () => getDateTimeInfo(e.startDate || "", e.startTime || ""),
    [e.startDate, e.startTime],
  );

  const endDateInfo = useMemo(
    () =>
      getDateTimeInfo(
        e.endDate || e.startDate || "",
        e.endTime || e.startTime || "",
      ),
    [e.endDate, e.startDate, e.endTime, e.startTime],
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

  const isOwner = demoMode || isCurrentUser;

  const iconSize = 16 * fontScale;
  const imageSize = 80 * fontScale;

  return (
    <EventMenu
      event={event}
      isOwner={isOwner}
      isSaved={isSaved}
      menuType="context"
      demoMode={demoMode}
    >
      <Pressable
        onPress={() => {
          // Short press → navigate
          const isDemoEvent = id.startsWith("demo-");
          if (isDemoEvent) {
            router.push(`/onboarding/demo-event/${id}`);
          } else {
            router.push(`/event/${id}`);
          }
        }}
        onLongPress={(e) => {
          // Long press → stop native press so menu can open without navigation
          e.stopPropagation();
        }}
        delayLongPress={350} // optional; adjust as desired
      >
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
                {dateString.date} • {dateString.time}
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
                      cachePolicy="disk"
                      transition={100}
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
                source={
                  typeof e.images[3] === "number"
                    ? e.images[3]
                    : {
                        uri: `${e.images[3]}?w=160&h=160&fit=cover&f=webp&q=80`,
                      }
                }
                style={{
                  width: imageSize,
                  height: imageSize,
                  borderRadius: 20,
                }}
                contentFit="cover"
                cachePolicy="disk"
                transition={100}
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
    </EventMenu>
  );
}

// 1. Memoize the list item component
const MemoizedUserEventListItem = React.memo(UserEventListItem);

function PromoCard({ type }: PromoCardProps) {
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
  demoMode?: boolean;
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
    demoMode,
  } = props;
  const { user } = useUser();
  const queryClient = useQueryClient();
  const username = user?.username || "";

  const savedIdsQuery = api.event.getSavedIdsForUser.useQuery({
    userName: username,
  });

  // Add memoization for collapseSimilarEvents
  const collapsedEvents = React.useMemo(
    () => collapseSimilarEvents(events, user?.id),
    [events, user?.id],
  );

  const pendingAIMutations = useMutationState(
    {
      filters: {
        mutationKey: [["ai"]],
      },
      select: (mutation) => mutation.state.status,
    },
    queryClient,
  );
  const isAddingEvent =
    pendingAIMutations.filter((mutation) => mutation === "pending").length > 0;

  const renderEmptyState = () => {
    if ((isAddingEvent || isRefetching) && collapsedEvents.length === 0) {
      return (
        <View className="flex-1">
          <EventListItemSkeleton />
        </View>
      );
    }

    return (
      <View className="flex-1 items-center justify-center px-6">
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
          cachePolicy="disk"
          transition={100}
        />
        <Text className="mb-2 rounded-lg text-center text-2xl font-bold text-neutral-1">
          Save events instantly
        </Text>
        <Text className="text-center text-base text-neutral-2">
          Tap the plus button to add your first event.
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

  // 3. Memoize expensive calculations outside of render
  const savedEventIds = React.useMemo(
    () => new Set(savedIdsQuery.data?.map((item) => item.id) || []),
    [savedIdsQuery.data],
  );

  return (
    <>
      <LegendList
        data={collapsedEvents}
        estimatedItemSize={130}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        renderItem={({ item, index }) => {
          // Use memoized values instead of calculating inside render
          const isSaved = savedEventIds.has(item.event.id);
          const similarEventsCount = item.similarEvents.length;

          return (
            <MemoizedUserEventListItem
              event={item.event}
              ActionButton={ActionButton}
              isLastItem={index === collapsedEvents.length - 1}
              showCreator={showCreator}
              isSaved={isSaved}
              similarEventsCount={
                similarEventsCount > 0 ? similarEventsCount : undefined
              }
              demoMode={demoMode}
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
          paddingBottom: 120,
          flexGrow: 1,
        }}
        ListFooterComponent={renderFooter()}
        keyExtractor={(item) => item.event.id}
      />
    </>
  );
}
