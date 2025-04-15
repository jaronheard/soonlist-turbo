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
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import Intercom from "@intercom/intercom-react-native";
import { useMutationState, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Copy,
  EyeOff,
  Globe2,
  MapPin,
  Navigation,
  Pencil,
  PlusCircle,
  QrCode,
  ShareIcon,
  User,
} from "lucide-react-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import { useEventActions } from "~/hooks/useEventActions";
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
import { logError } from "../utils/errorLogging";
import { EventListItemSkeleton } from "./EventListItemSkeleton";
import { EventMenu } from "./EventMenu";
import { EventStats } from "./EventStats";
import { UserProfileFlair } from "./UserProfileFlair";

type ShowCreatorOption = "always" | "otherUsers" | "never";

// Define the type for the stats data based on the expected query output
type EventStatsData = RouterOutputs["event"]["getStats"];

type Event = RouterOutputs["event"]["getDiscoverInfinite"]["events"][number];

interface ActionButtonProps {
  event: Event;
}

interface PromoCardProps {
  type: "addEvents";
}

interface UserEventListItemProps {
  event: Event;
  ActionButton?: React.ComponentType<ActionButtonProps>;
  showCreator: ShowCreatorOption;
  isSaved: boolean;
  similarEventsCount?: number;
  demoMode?: boolean;
  index: number;
}

export function UserEventListItem(props: UserEventListItemProps) {
  const {
    event,
    ActionButton,
    showCreator,
    isSaved,
    similarEventsCount,
    demoMode,
    index,
  } = props;
  const { fontScale } = useWindowDimensions();
  const {
    handleShare,
    handleDirections,
    handleAddToCal,
    handleEdit,
    handleShowQR,
  } = useEventActions({ event, isSaved, demoMode });
  const id = event.id;
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

  const queryClient = useQueryClient();

  const toggleVisibilityMutation = api.event.toggleVisibility.useMutation({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [["event"]] });
    },
    onError: (error) => {
      logError("Error toggling event visibility", error);
    },
  });

  const handleToggleVisibility = () => {
    if (toggleVisibilityMutation.isPending) return;
    const nextVisibility = event.visibility === "public" ? "private" : "public";
    toggleVisibilityMutation.mutate({
      id: event.id,
      visibility: nextVisibility,
    });
  };

  const isHappeningNow = relativeTime === "Happening now" && !eventIsOver;

  const { user: currentUser } = useUser();
  const eventUser = event.user;

  if (!eventUser) return null;

  const isCurrentUser = currentUser?.id === eventUser.id;

  const shouldShowCreator =
    showCreator === "always" ||
    (showCreator === "otherUsers" && !isCurrentUser);

  const isOwner = demoMode || isCurrentUser;

  const iconSize = 16 * fontScale;
  const imageWidth = 90 * fontScale;
  const imageHeight = (imageWidth * 16) / 9;

  const imageRotation = index % 2 === 0 ? "10deg" : "-10deg";

  return (
    <EventMenu
      event={event}
      isOwner={isOwner}
      isSaved={isSaved}
      menuType="context"
      demoMode={demoMode}
    >
      <Pressable
        className="relative"
        onPress={() => {
          const isDemoEvent = id.startsWith("demo-");
          if (isDemoEvent) {
            router.push(`/onboarding/demo-event/${id}`);
          } else {
            router.push(`/event/${id}`);
          }
        }}
        onLongPress={(e) => {
          e.stopPropagation();
        }}
        delayLongPress={350}
      >
        <View className={cn("relative mb-6 px-4")}>
          <View
            style={{
              position: "absolute",
              right: 10,
              top: -5,
              zIndex: 10,
              shadowColor: "#5A32FB",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.3,
              shadowRadius: 1.5,
              elevation: 3,
              transform: [{ rotate: imageRotation }],
              backgroundColor: "transparent",
            }}
          >
            <View
              style={{
                width: imageWidth,
                height: imageHeight,
                borderRadius: 20,
                overflow: "hidden",
                backgroundColor: "white",
              }}
            >
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
                    width: imageWidth,
                    height: imageHeight,
                    borderRadius: 20,
                    borderWidth: 3,
                    borderColor: "white",
                  }}
                  contentFit="cover"
                  cachePolicy="disk"
                  transition={100}
                />
              ) : (
                <View
                  className="border border-purple-300 bg-accent-yellow"
                  style={{
                    width: imageWidth,
                    height: imageHeight,
                  }}
                />
              )}
            </View>
          </View>
          <View
            className={cn(
              "mt-4 bg-white p-3",
              isHappeningNow ? "border border-accent-yellow" : "",
            )}
            style={{
              paddingRight: imageWidth * 1.1,
              borderRadius: 20,
              borderWidth: 3,
              borderColor: "white",
              shadowColor: "#5A32FB",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.15,
              shadowRadius: 2.5,
              elevation: 2,
              backgroundColor: "white",
            }}
          >
            <View className="mb-1 flex-row items-center justify-between">
              <View className="flex-row items-center gap-1">
                <Text className="text-sm font-medium text-neutral-2">
                  {dateString.date} • {dateString.time}
                </Text>
              </View>
              {isOwner && !ActionButton && (
                <View className="flex-row items-center gap-1 opacity-60">
                  {similarEventsCount ? (
                    <View className="flex-row items-center gap-0.5 rounded-full bg-neutral-4/70 px-1 py-0.5">
                      <Copy size={iconSize * 0.7} color="#627496" />
                      <Text className="text-xs text-neutral-2">
                        {similarEventsCount}
                      </Text>
                    </View>
                  ) : null}
                  <TouchableOpacity
                    onPress={handleToggleVisibility}
                    disabled={toggleVisibilityMutation.isPending}
                    className={cn(
                      "p-1",
                      toggleVisibilityMutation.isPending && "opacity-30",
                    )}
                  >
                    {event.visibility === "public" ? (
                      <Globe2 size={iconSize * 1} color="#627496" />
                    ) : (
                      <EyeOff size={iconSize * 1} color="#627496" />
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <Text
              className="mb-1 text-lg font-bold text-neutral-1"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {e.name}
            </Text>
            {e.location ? (
              <View className="mb-1 flex-shrink flex-row items-center gap-1">
                <MapPin size={iconSize * 0.9} color="#627496" />
                <Text
                  className="text-sm text-neutral-2"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {e.location}
                </Text>
              </View>
            ) : null}

            <View className="mt-2 flex-row items-center justify-start gap-2">
              <TouchableOpacity
                className="rounded-full p-1"
                onPress={handleDirections}
              >
                <Navigation size={iconSize} color="#5A32FB" />
              </TouchableOpacity>
              <TouchableOpacity
                className="rounded-full p-1"
                onPress={handleAddToCal}
              >
                <Calendar size={iconSize} color="#5A32FB" />
              </TouchableOpacity>
              {isOwner && (
                <TouchableOpacity
                  className="rounded-full p-1"
                  onPress={handleEdit}
                >
                  <Pencil size={iconSize} color="#5A32FB" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                className="rounded-full p-1"
                onPress={handleShowQR}
              >
                <QrCode size={iconSize} color="#5A32FB" />
              </TouchableOpacity>
              <TouchableOpacity
                className="rounded-full p-1"
                onPress={handleShare}
              >
                <ShareIcon size={iconSize} color="#5A32FB" />
              </TouchableOpacity>
            </View>
          </View>
          {ActionButton && (
            <View className="absolute bottom-6 right-6 z-[11]">
              <ActionButton event={event} />
            </View>
          )}
          {shouldShowCreator ? (
            <View className="mx-auto mt-1 flex-row items-center gap-3">
              <UserProfileFlair username={eventUser.username} size="xs">
                {eventUser.userImage ? (
                  <Image
                    source={{ uri: eventUser.userImage }}
                    style={{
                      width: iconSize * 0.9,
                      height: iconSize * 0.9,
                      borderRadius: 9999,
                    }}
                    contentFit="cover"
                    contentPosition="center"
                    cachePolicy="disk"
                    transition={100}
                  />
                ) : (
                  <User size={iconSize * 0.9} color="#627496" />
                )}
              </UserProfileFlair>
              <Text className="text-xs text-neutral-2">
                @{eventUser.username}
              </Text>
            </View>
          ) : null}
          {relativeTime && (
            <View className="absolute left-0 right-0 top-0 z-20 flex items-center justify-center">
              <View
                className={cn(
                  "rounded-full px-2 py-0.5",
                  isHappeningNow ? "bg-white" : "bg-accent-yellow",
                )}
                style={{
                  borderWidth: 2,
                  borderColor: "white",
                  shadowColor: "#5A32FB",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.15,
                  shadowRadius: 1,
                  elevation: 1,
                  backgroundColor: isHappeningNow ? "white" : "#FEEA9F",
                }}
              >
                <Text className="text-xs font-medium text-neutral-1">
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

function PromoCard({ type }: PromoCardProps) {
  const { fontScale } = useWindowDimensions();
  const iconSize = 16 * fontScale;

  const handlePress = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      useAppStore.setState({
        hasMediaPermission: status === MediaLibrary.PermissionStatus.GRANTED,
      });
    } catch (error) {
      logError("Error requesting media permissions", error);
    }
    router.push("/add");
  };

  if (type === "addEvents") {
    return (
      <TouchableOpacity onPress={handlePress}>
        <View className="mx-4 rounded-2xl bg-accent-yellow/80 p-4">
          <Text className="mb-1 text-lg font-semibold text-neutral-1">
            Add more events
          </Text>
          <View className="flex-row items-center">
            <Text className="text-base text-neutral-2">
              Tap the{" "}
              <PlusCircle size={iconSize} color="#4B5563" className="-mb-0.5" />{" "}
              button below to add more.
            </Text>
          </View>
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
  promoCard?: PromoCardProps;
  demoMode?: boolean;
  hasUnlimited?: boolean;
  stats?: EventStatsData;
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
    promoCard,
    demoMode,
    hasUnlimited = false,
    stats,
  } = props;
  const { user } = useUser();
  const queryClient = useQueryClient();
  const username = user?.username || "";

  const savedIdsQuery = api.event.getSavedIdsForUser.useQuery({
    userName: username,
  });

  const collapsedEvents = useMemo(
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

  const presentIntercom = async () => {
    try {
      await Intercom.present();
    } catch (error) {
      logError("Error presenting Intercom", error);
    }
  };

  const renderEmptyState = () => {
    if ((isAddingEvent || isRefetching) && collapsedEvents.length === 0) {
      return (
        <View className="flex-1">
          <EventListItemSkeleton />
        </View>
      );
    }

    if (!hasUnlimited) {
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
            Try free now
          </Text>
          <Pressable
            className="mb-4 text-center text-base text-neutral-2"
            onPress={presentIntercom}
          >
            <Text className="text-neutral-2">
              Funds an issue?{" "}
              <Text className="text-interactive-1">Message us</Text>
            </Text>
          </Pressable>
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
      {collapsedEvents.length >= 1 && promoCard ? (
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

  const renderHeader = () => {
    if (!stats) {
      return null;
    }

    return (
      <EventStats
        capturesThisWeek={stats.capturesThisWeek ?? 0}
        weeklyGoal={stats.weeklyGoal ?? 0}
        upcomingEvents={stats.upcomingEvents ?? 0}
        allTimeEvents={stats.allTimeEvents ?? 0}
      />
    );
  };

  return (
    <>
      <FlatList
        data={collapsedEvents}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        renderItem={({ item, index }) => {
          const eventData = item.event;
          const isSaved =
            savedIdsQuery.data?.some(
              (savedEvent) => savedEvent.id === eventData.id,
            ) ?? false;

          const similarEventsCount = item.similarEvents.length;

          return (
            <UserEventListItem
              event={eventData}
              ActionButton={ActionButton}
              showCreator={showCreator}
              isSaved={isSaved}
              similarEventsCount={
                similarEventsCount > 0 ? similarEventsCount : undefined
              }
              demoMode={demoMode}
              index={index}
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
          paddingTop: stats ? 0 : 16,
          paddingBottom: 120,
          flexGrow: collapsedEvents.length === 0 ? 1 : 0,
          backgroundColor: "#F4F1FF",
        }}
        ListFooterComponent={renderFooter()}
      />
    </>
  );
}
