import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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
import { logError } from "../utils/errorLogging";
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

interface UserEventListItemProps {
  event: Event;
  ActionButton?: React.ComponentType<ActionButtonProps>;
  showCreator: ShowCreatorOption;
  isSaved: boolean;
  similarEventsCount?: number;
  demoMode?: boolean;
}

export function UserEventListItem(props: UserEventListItemProps) {
  const {
    event,
    ActionButton,
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
  // Get screen width for the square image
  const screenWidth = Dimensions.get("window").width;
  const squareImageSize = screenWidth; // Full width square

  // Use the first image, or a fallback if none exist
  const mainImageUri = e.images?.[0]
    ? `${e.images[0]}?w=720&h=720&fit=cover&f=webp&q=80`
    : null;

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
        {/* Main container for the full-width square image and overlay */}
        <View
          className="relative mb-4 border-b border-neutral-3" // Added bottom border for gridline
          style={{ width: squareImageSize, height: squareImageSize }}
        >
          {/* Background Image */}
          {mainImageUri ? (
            <Image
              source={{ uri: mainImageUri }}
              style={{
                width: "100%",
                height: "100%",
                position: "absolute",
              }}
              contentFit="cover"
              cachePolicy="disk"
              transition={100}
            />
          ) : (
            // Fallback background if no image
            <View
              className="absolute h-full w-full bg-neutral-4" // Simple fallback background
            />
          )}

          {/* Overlay Card at the bottom - Use Flexbox for centering */}
          <View className="absolute bottom-4 left-4 right-4 flex-row items-center justify-between rounded-2xl bg-interactive-3 p-4 shadow-lg">
            {/* Wrapper for Text Content */}
            <View className="flex-1 pr-2">
              {/* flex-1 to take available space, pr-2 for spacing */}
              {/* Card Content */}
              <Text
                className="mb-1 text-lg font-bold text-neutral-1"
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {e.name}
              </Text>
              <View className="mb-1 flex-row items-center justify-between">
                {/* Lighter gray -> text-neutral-1 */}
                <Text className="text-sm font-medium text-neutral-1">
                  {dateString.date} • {dateString.time}
                </Text>
                {/* Moved owner/visibility icons inside overlay? Or remove? Keeping original logic for now */}
                {isOwner && !ActionButton && (
                  // Increased opacity slightly
                  <View className="flex-row items-center gap-1 opacity-80">
                    {similarEventsCount ? (
                      // Darker bg -> neutral-4 might work on interactive-3? Adjust if needed
                      <View className="flex-row items-center gap-0.5 rounded-full bg-neutral-4/70 px-1 py-0.5">
                        {/* Lighter icon -> neutral-1 */}
                        <Copy size={iconSize * 0.7} color="#171717" />{" "}
                        {/* Assuming neutral-1 is dark */}
                        {/* Lighter text -> neutral-1 */}
                        <Text className="text-xs text-neutral-1">
                          {similarEventsCount}
                        </Text>
                      </View>
                    ) : null}
                    {event.visibility === "public" ? (
                      // Lighter icon -> neutral-1
                      <Globe2 size={iconSize * 0.8} color="#171717" />
                    ) : (
                      // Lighter icon -> neutral-1
                      <EyeOff size={iconSize * 0.8} color="#171717" />
                    )}
                  </View>
                )}
              </View>
              {e.location ? (
                <View className="mb-1 flex-shrink flex-row items-center gap-1">
                  {/* Lighter icon -> neutral-1 */}
                  <MapPin size={iconSize * 0.9} color="#171717" />
                  {/* Lighter gray -> text-neutral-1 */}
                  <Text
                    className="text-sm text-neutral-1"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {e.location}
                  </Text>
                </View>
              ) : null}
              {/* Maybe remove creator info from this view or restyle */}
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
                      // Lighter icon -> neutral-1
                      <User size={iconSize * 0.9} color="#171717" />
                    )}
                  </UserProfileFlair>
                  {/* Lighter gray -> text-neutral-1 */}
                  <Text className="text-xs text-neutral-1">
                    @{eventUser.username}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Action Button - Now positioned by parent Flexbox */}
            {ActionButton && (
              <View>
                <ActionButton event={event} />
              </View>
            )}
          </View>

          {/* Relative Time Badge - kept from original */}
          {relativeTime && (
            <View className="absolute left-4 top-4 z-20">
              {/* Adjusted position */}
              <View
                className={cn(
                  "rounded-full px-2 py-0.5 shadow",
                  isHappeningNow ? "bg-white" : "bg-accent-yellow",
                )}
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
  stats?: {
    capturesThisWeek: number;
    weeklyGoal: number;
    upcomingEvents: number;
    allTimeEvents: number;
  };
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
    stats,
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

  // Collapse similar events
  const collapsedEvents = collapseSimilarEvents(events, user?.id);

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

  return (
    <>
      <FlatList
        data={collapsedEvents}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        renderItem={({ item, index: _index }) => {
          const isSaved =
            savedIdsQuery.data?.some(
              (savedEvent) => savedEvent.id === item.event.id,
            ) ?? false;

          const similarEventsCount = item.similarEvents.length;

          return (
            <UserEventListItem
              event={item.event}
              ActionButton={ActionButton}
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
          flexGrow: collapsedEvents.length === 0 ? 1 : 0,
          paddingTop: 10,
        }}
        ListFooterComponent={renderFooter()}
      />
    </>
  );
}
