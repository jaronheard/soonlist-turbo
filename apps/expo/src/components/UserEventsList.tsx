import type { FunctionReturnType } from "convex/server";
import type { ViewStyle } from "react-native";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

import type { api } from "@soonlist/backend/convex/_generated/api";
import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import {
  CalendarPlus,
  Copy,
  EyeOff,
  Globe2,
  MoreVertical,
  Plus,
  PlusIcon,
  ShareIcon,
  User,
} from "~/components/icons";
import { useAddEventFlow } from "~/hooks/useAddEventFlow";
import { useEventActions } from "~/hooks/useEventActions";
import { cn } from "~/utils/cn";
import {
  formatEventDateRange,
  formatRelativeTime,
  getDateTimeInfo,
  isOver,
} from "~/utils/dates";
import { getEventEmoji } from "~/utils/eventEmoji";
import { getEventStatus, getEventTimingLabel } from "~/utils/eventStatus";
import { collapseSimilarEvents } from "~/utils/similarEvents";
import { EventMenu } from "./EventMenu";
import { EventStats } from "./EventStats";
import { UserProfileFlair } from "./UserProfileFlair";

type ShowCreatorOption = "always" | "otherUsers" | "never" | "savedFromOthers";

// Define the type for the stats data based on the expected query output
type EventStatsData = FunctionReturnType<typeof api.events.getStats>;

type Event = NonNullable<FunctionReturnType<typeof api.events.get>>;

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
  savedAt?: Date;
  similarEventsCount?: number;
  demoMode?: boolean;
  index: number;
  hideDiscoverableButton?: boolean;
}

export function UserEventListItem(props: UserEventListItemProps) {
  const {
    event,
    ActionButton,
    showCreator,
    isSaved,
    savedAt,
    similarEventsCount,
    demoMode,
    index,
    hideDiscoverableButton = false,
  } = props;
  const { fontScale } = useWindowDimensions();
  const { handleAddToCal, handleToggleVisibility, handleShare, showDiscover } =
    useEventActions({ event, isSaved, demoMode });
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

  // Use client-side event status calculations for offline support
  const eventStatus = useMemo(() => {
    return getEventStatus(
      e.startDate + (e.startTime ? `T${e.startTime}` : ""),
      e.endDate
        ? e.endDate + (e.endTime ? `T${e.endTime}` : "")
        : e.startDate + (e.endTime ? `T${e.endTime}` : ""),
    );
  }, [e.startDate, e.startTime, e.endDate, e.endTime]);

  const eventIsOver = eventStatus === "ended";

  const relativeTime = useMemo(() => {
    if (!startDateInfo || eventIsOver) return "";
    return formatRelativeTime(startDateInfo);
  }, [startDateInfo, eventIsOver]);

  const isHappeningNow = eventStatus === "happening";

  const { user: currentUser } = useUser();
  const eventUser = event.user;

  const isRecent = useMemo(() => {
    const threeHoursAgoTimestamp = Date.now() - 3 * 60 * 60 * 1000;

    // Convert potential date strings to Date objects before comparison
    const createdAtDate = event.created_at ? new Date(event.created_at) : null;
    const savedAtDate = isSaved && savedAt ? new Date(savedAt) : null;

    // Check if the conversion resulted in a valid date and compare timestamps
    if (
      createdAtDate &&
      !isNaN(createdAtDate.getTime()) &&
      createdAtDate.getTime() > threeHoursAgoTimestamp
    ) {
      return true;
    }
    if (
      savedAtDate &&
      !isNaN(savedAtDate.getTime()) &&
      savedAtDate.getTime() > threeHoursAgoTimestamp
    ) {
      return true;
    }
    return false;
  }, [event.created_at, savedAt, isSaved]);

  const iconSize = 16 * fontScale;
  const imageWidth = 90 * fontScale;
  const imageHeight = (imageWidth * 16) / 9;

  const imageRotation = index % 2 === 0 ? "10deg" : "-10deg";

  const dynamicCardStyle = useMemo(() => {
    let currentBorderColor = "white"; // Default border color
    // Based on the "Happening now" badge, accent-yellow is #FEEA9F
    if (isHappeningNow) {
      currentBorderColor = "#FEEA9F";
    }

    // Base style properties
    const style: ViewStyle = {
      paddingRight: imageWidth * 1.1,
      borderRadius: 20,
      borderWidth: 3,
      borderColor: currentBorderColor,
      shadowColor: "#5A32FB",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2.5,
      elevation: 2,
      backgroundColor: "white",
    };

    if (isRecent) {
      style.borderColor = "#E0D9FF"; // Glow border color
      style.shadowColor = "#5A32FB"; // Glow shadow color
      style.shadowOpacity = 0.45; // Increased opacity for glow
      style.shadowRadius = 8; // Increased radius for glow
      style.elevation = 6; // Increased elevation for Android glow
    }
    return style;
  }, [isRecent, isHappeningNow, imageWidth]);

  if (!eventUser) return null;

  const isCurrentUser = currentUser?.id === eventUser.id;

  const shouldShowCreator =
    showCreator === "always" ||
    (showCreator === "otherUsers" && !isCurrentUser) ||
    (isSaved && !isCurrentUser && showCreator === "savedFromOthers");

  const isOwner = demoMode || isCurrentUser;

  // Get emoji and background color based on event type/category
  const { emoji, bgColor } = getEventEmoji(event);

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
                  contentPosition="top"
                  cachePolicy="disk"
                  transition={100}
                />
              ) : (
                <View
                  className={cn("border border-purple-300", bgColor)}
                  style={{
                    width: imageWidth,
                    height: imageHeight,
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: 20,
                    borderWidth: 3,
                    borderColor: "white",
                  }}
                >
                  <Text style={{ fontSize: 32 * fontScale }}>{emoji}</Text>
                </View>
              )}
            </View>
          </View>
          <View className={cn("my-1 mt-4 p-3")} style={dynamicCardStyle}>
            <View className="mb-1 flex-row items-center justify-between">
              <View className="flex-row items-center gap-1">
                <Text className="text-sm font-medium text-neutral-2">
                  {dateString.date} • {dateString.time}
                </Text>
              </View>
              {isOwner && !ActionButton && similarEventsCount ? (
                <View className="flex-row items-center gap-1 opacity-60">
                  <View className="flex-row items-center gap-0.5 rounded-full bg-neutral-4/70 px-1 py-0.5">
                    <Copy size={iconSize * 0.7} color="#627496" />
                    <Text className="text-xs text-neutral-2">
                      {similarEventsCount}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
            <Text
              className="mb-1 text-lg font-bold text-neutral-1"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {e.name}
            </Text>
            {e.location ? (
              <View className="mb-1 flex-shrink flex-row items-center">
                <Text
                  className="text-sm text-neutral-2"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {e.location}
                </Text>
              </View>
            ) : null}

            <View className="-mb-2 mt-1.5 flex-row items-center justify-start gap-3">
              {ActionButton && <ActionButton event={event} />}

              <TouchableOpacity
                className="-mb-0.5 -ml-2.5 flex-row items-center gap-2 bg-interactive-2 px-4 py-2.5"
                style={{ borderRadius: 16 }}
                onPress={handleShare}
                accessibilityLabel="Share with friends"
                accessibilityRole="button"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ShareIcon size={iconSize * 1.1} color="#5A32FB" />
                <Text className="text-base font-bold text-interactive-1">
                  Share with friends
                </Text>
              </TouchableOpacity>

              {/* <TouchableOpacity
                className="rounded-full p-2.5"
                onPress={handleDirections}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MapPinned size={iconSize} color="#5A32FB" />
              </TouchableOpacity> */}
              <TouchableOpacity
                className="rounded-full p-2.5"
                onPress={handleAddToCal}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <CalendarPlus size={iconSize * 1.1} color="#5A32FB" />
              </TouchableOpacity>

              {showDiscover && !hideDiscoverableButton && (
                <TouchableOpacity
                  className="rounded-full p-2.5"
                  onPress={() => {
                    const nextVisibility =
                      event.visibility === "public" ? "private" : "public";
                    void handleToggleVisibility(nextVisibility);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {event.visibility === "public" ? (
                    <Globe2 size={iconSize * 1.1} color="#5A32FB" />
                  ) : (
                    <EyeOff size={iconSize * 1.1} color="#5A32FB" />
                  )}
                </TouchableOpacity>
              )}

              <EventMenu
                event={event}
                isOwner={isOwner}
                isSaved={isSaved}
                menuType="popup"
                demoMode={demoMode}
              >
                <TouchableOpacity
                  className="rounded-full p-2.5"
                  onPress={(e) => {
                    e.stopPropagation();
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MoreVertical size={iconSize * 1.1} color="#5A32FB" />
                </TouchableOpacity>
              </EventMenu>
            </View>
          </View>
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
          <View className="absolute left-0 right-0 top-0 z-20 flex flex-row items-center justify-center space-x-2">
            {isRecent && (
              <View
                className={cn("rounded-full px-2 py-0.5", "bg-accent-purple")}
                style={{
                  borderWidth: 2,
                  borderColor: "white",
                  shadowColor: "#5A32FB",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.15,
                  shadowRadius: 1,
                  elevation: 1,
                  backgroundColor: "#E0D9FF",
                }}
              >
                <Text className="text-xs font-medium text-neutral-1">New</Text>
              </View>
            )}
            {relativeTime && (
              <View
                className={cn("rounded-full px-2 py-0.5", "bg-accent-yellow")}
                style={{
                  borderWidth: 2,
                  borderColor: "white",
                  shadowColor: "#5A32FB",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.15,
                  shadowRadius: 1,
                  elevation: 1,
                  backgroundColor: "#FEEA9F",
                }}
              >
                <Text className="text-xs font-medium text-neutral-1">
                  {relativeTime}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </EventMenu>
  );
}

function PromoCard({ type }: PromoCardProps) {
  const { fontScale } = useWindowDimensions();
  const iconSize = 16 * fontScale;

  const { triggerAddEventFlow } = useAddEventFlow();

  const handlePress = () => {
    void triggerAddEventFlow();
  };

  if (type === "addEvents") {
    return (
      <TouchableOpacity onPress={handlePress}>
        <View
          className="mx-4 rounded-2xl bg-accent-yellow/80 p-4"
          style={{
            borderWidth: 3,
            borderColor: "white",
            shadowColor: "#5A32FB",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15,
            shadowRadius: 2.5,
            elevation: 2,
          }}
        >
          <Text className="mb-1 text-lg font-semibold text-neutral-1">
            Add more events
          </Text>
          <View className="flex-row items-center">
            <Text className="text-base text-neutral-2">
              Tap the{" "}
              <View
                className="inline-flex items-center justify-center rounded-full bg-interactive-1"
                style={{
                  width: iconSize * 1.5,
                  height: iconSize * 1.5,
                  marginHorizontal: 2,
                  marginVertical: -2,
                }}
              >
                <Plus size={iconSize} color="#FFFFFF" strokeWidth={3} />
              </View>{" "}
              button below to add more.
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return null;
}

const GhostEventCard = ({ index }: { index: number }) => {
  const { fontScale } = useWindowDimensions();

  const imageWidth = 90 * fontScale;
  const imageHeight = (imageWidth * 16) / 9;
  const imageRotation = index % 2 === 0 ? "10deg" : "-10deg";

  return (
    <View className="relative mb-6 px-4">
      {/* Ghost image placeholder with dashed border - matching exact positioning */}
      <View
        style={{
          position: "absolute",
          right: 10,
          top: -5,
          zIndex: 10,
          transform: [{ rotate: imageRotation }],
          backgroundColor: "transparent",
        }}
      >
        <View
          style={{
            width: imageWidth,
            height: imageHeight,
            borderRadius: 20,
            borderWidth: 3,
            borderColor: "#E0D9FF",
            borderStyle: "dashed",
            backgroundColor: "#FAFAFF",
          }}
        />
      </View>

      {/* Ghost card content with dashed border - matching exact card style */}
      <View
        className="my-1 mt-4 p-3"
        style={{
          paddingRight: imageWidth * 1.1,
          borderRadius: 20,
          borderWidth: 3,
          borderColor: "#E0D9FF",
          borderStyle: "dashed",
          backgroundColor: "#FAFAFF",
        }}
      >
        {/* Gray lines representing text content */}
        <View>
          {/* Date/time line */}
          <View
            className="mb-2 rounded"
            style={{
              height: 14 * fontScale,
              width: 120 * fontScale,
              backgroundColor: "#F4F1FF",
            }}
          />

          {/* Title line */}
          <View
            className="mb-2 rounded"
            style={{
              height: 20 * fontScale,
              width: "85%",
              backgroundColor: "#F4F1FF",
            }}
          />

          {/* Location line */}
          <View
            className="mb-1 rounded"
            style={{
              height: 14 * fontScale,
              width: 160 * fontScale,
              backgroundColor: "#F4F1FF",
            }}
          />

          {/* Action buttons row */}
          <View className="-mb-2 mt-1.5 flex-row items-center justify-start gap-3">
            {/* Ghost Share button */}
            <View
              className="-ml-2 rounded"
              style={{
                borderRadius: 16,
                backgroundColor: "#F4F1FF",
                height: 36 * fontScale,
                width: 96 * fontScale,
              }}
            />

            {/* Two circular buttons */}
            {[0, 1].map((i) => (
              <View
                key={i}
                className="rounded-full p-2.5"
                style={{
                  width: 24 * fontScale,
                  height: 24 * fontScale,
                  backgroundColor: "#F4F1FF",
                }}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

const EmptyStateHeader = () => {
  const { fontScale } = useWindowDimensions();
  const { triggerAddEventFlow } = useAddEventFlow();

  return (
    <TouchableOpacity
      className="my-6 items-center px-4"
      onPress={() => void triggerAddEventFlow()}
      activeOpacity={0.7}
    >
      <Text
        className="mb-2 text-center text-2xl font-bold text-neutral-1"
        style={{ fontSize: 24 * fontScale }}
      >
        Your events, <Text style={{ color: "#5A32FB" }}>all in one place</Text>
      </Text>
      <View className="flex-row items-center justify-center">
        <Text
          className="text-center text-base text-neutral-2"
          style={{ fontSize: 16 * fontScale }}
        >
          Tap
        </Text>
        <View
          className="mx-1.5 items-center justify-center rounded-full bg-interactive-1"
          style={{
            width: 20 * fontScale,
            height: 20 * fontScale,
          }}
        >
          <PlusIcon size={12 * fontScale} color="#FFF" strokeWidth={3} />
        </View>
        <Text
          className="text-center text-base text-neutral-2"
          style={{ fontSize: 16 * fontScale }}
        >
          to add from screenshots
        </Text>
      </View>
    </TouchableOpacity>
  );
};

interface UserEventsListProps {
  events: Event[];
  ActionButton?: React.ComponentType<ActionButtonProps>;
  showCreator: ShowCreatorOption;
  onEndReached: () => void;
  isFetchingNextPage: boolean;
  isLoadingFirstPage?: boolean;
  promoCard?: PromoCardProps;
  demoMode?: boolean;
  hasUnlimited?: boolean;
  stats?: EventStatsData;
  hideDiscoverableButton?: boolean;
  refreshControl?: React.ReactElement<any>;
}

export default function UserEventsList(props: UserEventsListProps) {
  const {
    events,
    ActionButton,
    showCreator,
    onEndReached,
    isFetchingNextPage,
    isLoadingFirstPage = false,
    promoCard,
    demoMode,
    stats,
    hideDiscoverableButton = false,
    refreshControl,
  } = props;
  const { user } = useUser();

  const collapsedEvents = useMemo(
    () => collapseSimilarEvents(events, user?.id),
    [events, user?.id],
  );

  const renderEmptyState = () => {
    return (
      <ScrollView
        style={{ backgroundColor: "#F4F1FF" }}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: 120,
          flexGrow: 1,
          backgroundColor: "#F4F1FF",
        }}
        showsVerticalScrollIndicator={false}
      >
        <EmptyStateHeader />
        <GhostEventCard index={0} />
        <GhostEventCard index={1} />
        <GhostEventCard index={2} />
        <GhostEventCard index={3} />
        <GhostEventCard index={4} />
      </ScrollView>
    );
  };

  if (isLoadingFirstPage) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#5A32FB" />
      </View>
    );
  }

  if (collapsedEvents.length === 0) {
    return renderEmptyState();
  }

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
          const isSaved = eventData.user?.id === user?.id;
          // TODO: Add savedAt

          const similarEventsCount = item.similarEvents.length;

          return (
            <UserEventListItem
              event={eventData}
              ActionButton={ActionButton}
              showCreator={showCreator}
              isSaved={isSaved}
              // TODO: Add savedAt
              savedAt={undefined}
              similarEventsCount={
                similarEventsCount > 0 ? similarEventsCount : undefined
              }
              demoMode={demoMode}
              index={index}
              hideDiscoverableButton={hideDiscoverableButton}
            />
          );
        }}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        style={{ backgroundColor: "#F4F1FF" }}
        contentContainerStyle={{
          paddingTop: stats ? 0 : 16,
          paddingBottom: 120,
          flexGrow: collapsedEvents.length === 0 ? 1 : 0,
          backgroundColor: "#F4F1FF",
        }}
        ListFooterComponent={renderFooter()}
        refreshControl={refreshControl}
      />
    </>
  );
}
