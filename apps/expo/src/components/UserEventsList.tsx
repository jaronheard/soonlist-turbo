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
  Share,
  User,
} from "lucide-react-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import type { EventWithSimilarity } from "~/utils/similarEvents";
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
import { UserProfileFlair } from "./UserProfileFlair";

type ShowCreatorOption = "always" | "otherUsers" | "never";

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

interface CurrentVibeProps {
  events: EventWithSimilarity[];
}

function getEventDetails(
  item: EventWithSimilarity,
): AddToCalendarButtonPropsRestricted | null {
  const details = item.event.event as
    | AddToCalendarButtonPropsRestricted
    | undefined;
  return details ?? null;
}

function CurrentVibe({ events }: CurrentVibeProps) {
  const { fontScale } = useWindowDimensions();

  const { quantityVibe, contentVibe } = useMemo(() => {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcomingEvents = events.filter((item) => {
      const details = getEventDetails(item);
      if (!details) return false;
      const endDateInfo = getDateTimeInfo(
        details.endDate || details.startDate || "",
        details.endTime || details.startTime || "",
      );
      if (!endDateInfo) return false;
      const endDate = new Date(
        endDateInfo.year,
        endDateInfo.month - 1,
        endDateInfo.day,
        endDateInfo.hour,
        endDateInfo.minute,
      );
      return endDate > now;
    });

    let calculatedQuantityVibe = { emoji: "✨", text: "Fresh Start" };
    if (upcomingEvents.length > 0) {
      const soonEvents = upcomingEvents.filter((item) => {
        const details = getEventDetails(item);
        if (!details) return false;
        const startDateInfo = getDateTimeInfo(
          details.startDate || "",
          details.startTime || "",
        );
        if (!startDateInfo) return false;
        const startDate = new Date(
          startDateInfo.year,
          startDateInfo.month - 1,
          startDateInfo.day,
          startDateInfo.hour,
          startDateInfo.minute,
        );
        return startDate < oneWeekFromNow;
      });

      const farEvents = upcomingEvents.length - soonEvents.length;

      if (soonEvents.length > farEvents && soonEvents.length >= 3) {
        calculatedQuantityVibe = { emoji: "🚀", text: "Packed Week!" };
      } else if (soonEvents.length > 0 && soonEvents.length >= farEvents) {
        calculatedQuantityVibe = { emoji: "🎉", text: "Getting Busy" };
      } else if (farEvents > soonEvents.length && farEvents >= 2) {
        calculatedQuantityVibe = { emoji: "🤔", text: "Planning Ahead" };
      } else {
        calculatedQuantityVibe = { emoji: "🗓️", text: "Upcoming Fun" };
      }
    }

    let calculatedContentVibe = { emoji: "🌟", text: "Good Times" };
    const upcomingEventNames = upcomingEvents
      .map((item) => getEventDetails(item)?.name?.toLowerCase() || "")
      .filter((name) => name);

    const musicKeywords = ["music", "concert", "dj", "live band", "show"];
    const communityKeywords = [
      "community",
      "volunteer",
      "mutual aid",
      "gathering",
      "potluck",
    ];
    const activismKeywords = [
      "protest",
      "rally",
      "march",
      "activism",
      "justice",
    ];
    const artKeywords = [
      "art",
      "gallery",
      "exhibit",
      "craft",
      "market",
      "workshop",
    ];

    let musicCount = 0;
    let communityCount = 0;
    let activismCount = 0;
    let artCount = 0;

    upcomingEventNames.forEach((name) => {
      if (musicKeywords.some((kw) => name.includes(kw))) musicCount++;
      if (communityKeywords.some((kw) => name.includes(kw))) communityCount++;
      if (activismKeywords.some((kw) => name.includes(kw))) activismCount++;
      if (artKeywords.some((kw) => name.includes(kw))) artCount++;
    });

    const categoryCounts = [
      { type: "Music", count: musicCount, emoji: "🎵" },
      { type: "Community", count: communityCount, emoji: "🤝" },
      { type: "Activism", count: activismCount, emoji: "✊" },
      { type: "Art & Market", count: artCount, emoji: "🎨" },
    ].sort((a, b) => b.count - a.count);

    if (upcomingEvents.length === 0) {
      calculatedContentVibe = { emoji: "👀", text: "What's Next?" };
    } else if (categoryCounts[0] && categoryCounts[0].count > 0) {
      calculatedContentVibe = {
        emoji: categoryCounts[0].emoji,
        text: categoryCounts[0].type + " Focus",
      };
    } else {
      calculatedContentVibe = { emoji: "✨", text: "Diverse Mix" };
    }

    return {
      quantityVibe: calculatedQuantityVibe,
      contentVibe: calculatedContentVibe,
    };
  }, [events]);

  if (events.length === 0) return null;

  return (
    <View className="mx-4 mb-4 mt-4 flex-row flex-wrap items-start justify-center gap-2">
      <View
        className="bg-accent-purple/20 self-start rounded-full p-2 px-3 shadow-md"
        style={{
          shadowColor: "#5A32FB",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 3,
          elevation: 4,
          transform: [{ rotate: "-2deg" }],
        }}
      >
        <Text
          style={{ fontSize: 16 * fontScale }}
          className="font-semibold text-neutral-1"
        >
          {quantityVibe.emoji}{" "}
          <Text style={{ fontSize: 13 * fontScale }} className="font-medium">
            {quantityVibe.text}
          </Text>
        </Text>
      </View>

      <View
        className="self-start rounded-full bg-accent-yellow/20 p-2 px-3 shadow-md"
        style={{
          shadowColor: "#FFC107",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 3,
          elevation: 4,
          transform: [{ rotate: "3deg" }],
        }}
      >
        <Text
          style={{ fontSize: 16 * fontScale }}
          className="font-semibold text-neutral-1"
        >
          {contentVibe.emoji}{" "}
          <Text style={{ fontSize: 13 * fontScale }} className="font-medium">
            {contentVibe.text}
          </Text>
        </Text>
      </View>
    </View>
  );
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
                className="rounded-2xl border border-purple-300 bg-accent-yellow"
                style={{
                  width: imageWidth,
                  height: imageHeight,
                }}
              />
            )}
          </View>
          <View
            className={cn(
              "mt-4 bg-white p-3",
              isHappeningNow ? "border border-accent-yellow" : "",
            )}
            style={{
              marginRight: imageWidth * 0.6,
              borderRadius: 20,
              borderWidth: 3,
              borderColor: "white",
              shadowColor: "#5A32FB",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.15,
              shadowRadius: 2.5,
              elevation: 2,
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
                  {event.visibility === "public" ? (
                    <Globe2 size={iconSize * 0.8} color="#627496" />
                  ) : (
                    <EyeOff size={iconSize * 0.8} color="#627496" />
                  )}
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
            {shouldShowCreator ? (
              <View className="mt-1 flex-row items-center gap-1">
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
            <View className="mt-2 flex-row items-center justify-start gap-2">
              <TouchableOpacity className="rounded-full p-1">
                <Navigation size={iconSize} color="#5A32FB" />
              </TouchableOpacity>
              <TouchableOpacity className="rounded-full p-1">
                <Calendar size={iconSize} color="#5A32FB" />
              </TouchableOpacity>
              <TouchableOpacity className="rounded-full p-1">
                <Pencil size={iconSize} color="#5A32FB" />
              </TouchableOpacity>
              <TouchableOpacity className="rounded-full p-1">
                <QrCode size={iconSize} color="#5A32FB" />
              </TouchableOpacity>
              <TouchableOpacity className="rounded-full p-1">
                <Share size={iconSize} color="#5A32FB" />
              </TouchableOpacity>
            </View>
          </View>
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
    router.push("/new");
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

  const renderHeader = () => <CurrentVibe events={collapsedEvents} />;

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
          paddingBottom: 120,
          flexGrow: collapsedEvents.length === 0 ? 1 : 0,
          backgroundColor: "#F4F1FF",
        }}
        ListFooterComponent={renderFooter()}
      />
    </>
  );
}
