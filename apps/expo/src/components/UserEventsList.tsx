import type { FunctionReturnType } from "convex/server";
import type { ViewStyle } from "react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { FlatList } from "react-native-gesture-handler";
import Animated, { FadeInDown, FadeInLeft } from "react-native-reanimated";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

import type { api } from "@soonlist/backend/convex/_generated/api";
import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";
import { getTimezoneAbbreviation } from "@soonlist/cal";

import type { EventWithSimilarity } from "~/utils/similarEvents";
import {
  CalendarPlus,
  Copy,
  EyeOff,
  Globe2,
  MoreVertical,
  ShareIcon,
  User,
} from "~/components/icons";
import { useAddEventFlow } from "~/hooks/useAddEventFlow";
import { useEventActions } from "~/hooks/useEventActions";
import { useUserTimezone } from "~/store";
import { cn } from "~/utils/cn";
import {
  formatEventDateRange,
  formatRelativeTime,
  getDateTimeInfo,
  isOver,
} from "~/utils/dates";
import { setEventCache } from "~/utils/eventCache";
import { getEventEmoji } from "~/utils/eventEmoji";
import { collapseSimilarEvents } from "~/utils/similarEvents";
import { EventMenu } from "./EventMenu";
import { EventStats } from "./EventStats";
import { UserProfileFlair } from "./UserProfileFlair";

type ShowCreatorOption = "always" | "otherUsers" | "never" | "savedFromOthers";

// Type for enriched event follow with user data
interface EnrichedEventFollow {
  userId: string;
  eventId: string;
  user: {
    id: string;
    username: string;
    displayName?: string | null;
    userImage?: string | null;
  } | null;
}

// Type for user display in stacked avatars
interface UserForDisplay {
  id: string;
  username: string;
  displayName?: string | null;
  userImage?: string | null;
}

// Stacked avatars component for showing multiple users who saved an event
function EventSaversRow({
  creator,
  savers,
  iconSize,
  eventId,
  currentUserId,
}: {
  creator: UserForDisplay;
  savers: UserForDisplay[];
  iconSize: number;
  eventId: string;
  currentUserId?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Combine creator with savers, deduplicate by id, and limit to first 2
  const allUsers: UserForDisplay[] = [creator];
  for (const saver of savers) {
    if (!allUsers.some((u) => u.id === saver.id)) {
      allUsers.push(saver);
    }
  }

  const displayUsers = allUsers.slice(0, 2);
  const remainingCount = allUsers.length - displayUsers.length;

  const handleUserPress = (user: UserForDisplay) => {
    // If clicking on yourself, go to account settings
    if (currentUserId && user.id === currentUserId) {
      router.push("/settings/account");
    } else {
      router.push(`/${user.username}`);
    }
  };

  const avatarSize = iconSize * 1.1;
  const overlap = avatarSize * 0.3;

  // Render individual tappable name
  const renderTappableName = (user: UserForDisplay, isLast: boolean) => {
    const displayName = user.displayName || user.username || "unknown";
    return (
      <Pressable
        key={user.id}
        onPress={() => handleUserPress(user)}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      >
        <Text className="text-xs text-neutral-2">
          {displayName}
          {!isLast && ", "}
        </Text>
      </Pressable>
    );
  };

  // Collapsed view
  if (!isExpanded) {
    return (
      <View className="mx-auto mt-1 flex-row items-center gap-2">
        {/* Stacked avatars */}
        <View
          className="flex-row items-center"
          style={{
            width:
              avatarSize + (displayUsers.length - 1) * (avatarSize - overlap),
          }}
        >
          {displayUsers.map((user, index) => (
            <Pressable
              key={user.id}
              onPress={() => handleUserPress(user)}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
              style={{
                position: index === 0 ? "relative" : "absolute",
                left: index * (avatarSize - overlap),
                zIndex: displayUsers.length - index,
              }}
            >
              <UserProfileFlair username={user.username} size="xs">
                {user.userImage ? (
                  <ExpoImage
                    source={{ uri: user.userImage }}
                    style={{
                      width: avatarSize,
                      height: avatarSize,
                      borderRadius: 9999,
                      borderWidth: 2,
                      borderColor: "white",
                    }}
                    contentFit="cover"
                    contentPosition="center"
                    cachePolicy="disk"
                    transition={100}
                    recyclingKey={`${eventId}-saver-${user.id}`}
                  />
                ) : (
                  <View
                    style={{
                      width: avatarSize,
                      height: avatarSize,
                      borderRadius: 9999,
                      borderWidth: 2,
                      borderColor: "white",
                      backgroundColor: "#E0D9FF",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <User size={avatarSize * 0.6} color="#627496" />
                  </View>
                )}
              </UserProfileFlair>
            </Pressable>
          ))}
        </View>

        {/* Names text - individually tappable */}
        <View className="flex-row flex-wrap items-center">
          {displayUsers.map((user, index) =>
            renderTappableName(
              user,
              index === displayUsers.length - 1 && remainingCount === 0,
            ),
          )}
          {remainingCount > 0 && (
            <Pressable
              onPress={() => setIsExpanded(true)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Text className="text-xs text-interactive-1">
                +{remainingCount} more
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // Expanded view - show all users in a vertical list
  return (
    <View className="mx-auto mt-1">
      <TouchableOpacity
        onPress={() => setIsExpanded(false)}
        className="mb-2 items-center"
        activeOpacity={0.7}
      >
        <Text className="text-xs text-interactive-1">Hide</Text>
      </TouchableOpacity>
      <View className="space-y-2">
        {allUsers.map((user) => (
          <TouchableOpacity
            key={user.id}
            onPress={() => handleUserPress(user)}
            className="flex-row items-center py-1"
            activeOpacity={0.7}
          >
            <UserProfileFlair username={user.username} size="xs">
              {user.userImage ? (
                <ExpoImage
                  source={{ uri: user.userImage }}
                  style={{
                    width: avatarSize,
                    height: avatarSize,
                    borderRadius: 9999,
                    borderWidth: 2,
                    borderColor: "white",
                  }}
                  contentFit="cover"
                  contentPosition="center"
                  cachePolicy="disk"
                  transition={100}
                  recyclingKey={`${eventId}-saver-expanded-${user.id}`}
                />
              ) : (
                <View
                  style={{
                    width: avatarSize,
                    height: avatarSize,
                    borderRadius: 9999,
                    borderWidth: 2,
                    borderColor: "white",
                    backgroundColor: "#E0D9FF",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <User size={avatarSize * 0.6} color="#627496" />
                </View>
              )}
            </UserProfileFlair>
            <Text className="ml-2 text-xs text-neutral-2">
              {user.displayName || user.username}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// Define the type for the stats data based on the expected query output
type EventStatsData = FunctionReturnType<typeof api.events.getStats>;

type Event = NonNullable<FunctionReturnType<typeof api.events.get>>;

interface ActionButtonProps {
  event: Event;
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
  isDiscoverFeed?: boolean;
  source?: string;
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
    isDiscoverFeed = false,
    source,
  } = props;
  const { fontScale } = useWindowDimensions();
  const { handleAddToCal, handleToggleVisibility, handleShare, showDiscover } =
    useEventActions({ event, isSaved, demoMode, source });
  const id = event.id;
  const e = event.event as AddToCalendarButtonPropsRestricted;
  const userTimezone = useUserTimezone();

  // Normalize timezones for comparison
  const normalizeTimezone = (tz?: string): string => {
    if (!tz || tz === "unknown" || tz.trim() === "") return "";
    return tz.trim().toLowerCase();
  };

  const normalizedEventTz = normalizeTimezone(e.timeZone);
  const normalizedUserTz = normalizeTimezone(userTimezone);

  // Get timezone abbreviation if timezones differ
  const shouldShowTimezone =
    normalizedEventTz &&
    normalizedUserTz &&
    normalizedEventTz !== normalizedUserTz &&
    e.startTime; // Only show for timed events

  const timezoneAbbreviation = shouldShowTimezone
    ? getTimezoneAbbreviation(e.timeZone || "")
    : undefined;

  const dateString = formatEventDateRange(
    e.startDate || "",
    e.startTime,
    e.endTime,
    e.timeZone || "",
    timezoneAbbreviation,
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

  // Prefetch the full-size image for the detail screen so it loads instantly
  useEffect(() => {
    const imageUrl = e.images?.[3];
    if (imageUrl && typeof imageUrl === "string") {
      void ExpoImage.prefetch(`${imageUrl}?max-w=1284&fit=contain&f=webp&q=80`);
    }
  }, [e.images]);

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

    // Base style properties - flat design with minimal shadows
    const style: ViewStyle = {
      paddingRight: imageWidth * 1.1,
      borderWidth: 3,
      borderColor: currentBorderColor,
      backgroundColor: "white",
    };

    if (isRecent) {
      style.borderColor = "#E0D9FF"; // Glow border color
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
            router.navigate(`/onboarding/demo-event/${id}`);
          } else {
            setEventCache(id, event);
            router.navigate(`/event/${id}`);
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
                <ExpoImage
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
                  recyclingKey={event.id}
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
          <View
            className={cn("my-1 mt-4 rounded-2xl p-3")}
            style={dynamicCardStyle}
          >
            <View className="mb-1 flex-row items-center justify-between">
              <View className="flex-row items-center gap-1">
                <Text className="text-sm font-medium text-neutral-2">
                  {dateString.date} • {dateString.time}
                  {dateString.eventTime && (
                    <>
                      {" "}
                      <Text style={{ fontStyle: "italic" }}>
                        {dateString.eventTime}
                      </Text>
                    </>
                  )}
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
                className="-mb-0.5 -ml-2.5 flex-row items-center gap-1 py-2.5 pl-4 pr-1"
                onPress={handleAddToCal}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <CalendarPlus size={iconSize * 1.1} color="#5A32FB" />
                <Text className="text-base font-bold text-interactive-1">
                  Add
                </Text>
              </TouchableOpacity>

              {!isDiscoverFeed && (
                <TouchableOpacity
                  className="rounded-full p-2.5"
                  onPress={handleShare}
                  accessibilityLabel="Share"
                  accessibilityRole="button"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <ShareIcon size={iconSize * 1.1} color="#5A32FB" />
                </TouchableOpacity>
              )}

              {/* <TouchableOpacity
                className="rounded-full p-2.5"
                onPress={handleDirections}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MapPinned size={iconSize} color="#5A32FB" />
              </TouchableOpacity> */}

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
            <EventSaversRow
              creator={{
                id: eventUser.id,
                username: eventUser.username,
                displayName: eventUser.displayName,
                userImage: eventUser.userImage,
              }}
              savers={
                (event.eventFollows as EnrichedEventFollow[] | undefined)
                  ?.filter(
                    (
                      f,
                    ): f is EnrichedEventFollow & {
                      user: NonNullable<EnrichedEventFollow["user"]>;
                    } => f.user !== null,
                  )
                  .map((f) => ({
                    id: f.user.id,
                    username: f.user.username,
                    displayName: f.user.displayName,
                    userImage: f.user.userImage,
                  })) ?? []
              }
              iconSize={iconSize}
              eventId={event.id}
              currentUserId={currentUser?.id}
            />
          ) : null}
          <View className="absolute left-0 right-0 top-0 z-20 flex flex-row items-center justify-center space-x-2">
            {isRecent && (
              <View
                className={cn("rounded-full px-2 py-0.5", "bg-accent-purple")}
                style={{
                  borderWidth: 2,
                  borderColor: "white",
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

const SourceStickersRow = () => {
  const { fontScale } = useWindowDimensions();
  const iconSize = 25 * fontScale;
  const { triggerAddEventFlow } = useAddEventFlow();

  return (
    <View className="mb-6 items-center px-4">
      <Animated.View entering={FadeInLeft.delay(550).duration(500).springify()}>
        <TouchableOpacity
          className="mb-2 flex-row items-center justify-center gap-2.5 rounded-full bg-interactive-2 px-6 py-3.5"
          onPress={() => void triggerAddEventFlow()}
          activeOpacity={0.7}
        >
          <Text
            className="font-semibold text-neutral-1"
            style={{ fontSize: 20 * fontScale }}
          >
            Screenshot events →
          </Text>
          <Image
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
            source={require("../assets/capture-cta.png")}
            style={{ width: iconSize, height: iconSize, marginRight: -4 }}
          />
          <Text
            className="font-semibold"
            style={{ fontSize: 20 * fontScale, color: "#5A32FB" }}
          >
            Add
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const ScreenshotCta = () => {
  const { fontScale } = useWindowDimensions();
  const iconSize = 16 * fontScale;
  const { triggerAddEventFlow } = useAddEventFlow();

  return (
    <View className="mb-6 items-center py-4">
      <TouchableOpacity
        className="flex-row items-center justify-center gap-1.5 rounded-full bg-interactive-2 px-4 py-3"
        onPress={() => void triggerAddEventFlow()}
        activeOpacity={0.7}
      >
        <Text
          className="text-center font-semibold text-neutral-1"
          style={{ fontSize: 14 * fontScale }}
        >
          Screenshot events →
        </Text>
        <Image
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
          source={require("../assets/capture-cta.png")}
          style={{ width: iconSize, height: iconSize }}
        />
        <Text
          className="text-center font-semibold text-neutral-1"
          style={{ fontSize: 14 * fontScale }}
        >
          Add
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const GhostEventCard = ({ index }: { index: number }) => {
  const { fontScale } = useWindowDimensions();

  const imageWidth = 90 * fontScale;
  const imageHeight = (imageWidth * 16) / 9;
  const imageRotation = index % 2 === 0 ? "10deg" : "-10deg";

  return (
    <View className="relative mb-6 px-4 opacity-50">
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
            backgroundColor: "#F4F1FF",
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
          backgroundColor: "#F4F1FF",
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
              backgroundColor: "#EDE8FF",
            }}
          />

          {/* Title line */}
          <View
            className="mb-2 rounded"
            style={{
              height: 20 * fontScale,
              width: "85%",
              backgroundColor: "#EDE8FF",
            }}
          />

          {/* Location line */}
          <View
            className="mb-1 rounded"
            style={{
              height: 14 * fontScale,
              width: 160 * fontScale,
              backgroundColor: "#EDE8FF",
            }}
          />

          {/* Action buttons row */}
          <View className="-mb-2 mt-1.5 flex-row items-center justify-start gap-3">
            {/* Ghost Share button */}
            <View
              className="-ml-2 rounded"
              style={{
                borderRadius: 16,
                backgroundColor: "#EDE8FF",
                height: 36 * fontScale,
                width: 96 * fontScale,
              }}
            />

            {/* Two circular buttons */}
            {[0, 1].map((i) => (
              <View
                key={i}
                className="rounded-full"
                style={{
                  width: 24 * fontScale,
                  height: 24 * fontScale,
                  backgroundColor: "#EDE8FF",
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
  const iconSize = 14 * fontScale;
  const { triggerAddEventFlow } = useAddEventFlow();
  const fontSize = 24 * fontScale;

  const sources = [
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
    { source: require("../assets/app-icons/instagram-gray.png") },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
    { source: require("../assets/app-icons/tiktok-gray.png") },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
    { source: require("../assets/app-icons/messages-gray.png") },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
    { source: require("../assets/app-icons/mail-gray.png") },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
    { source: require("../assets/app-icons/safari-gray.png") },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
    { source: require("../assets/app-icons/partiful-gray.png") },
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
    { source: require("../assets/app-icons/posters-gray.png") },
  ];

  return (
    <TouchableOpacity
      className="mb-6 items-center px-4"
      onPress={() => void triggerAddEventFlow()}
      activeOpacity={0.7}
    >
      <Text
        className="text-center text-2xl font-bold text-neutral-1"
        style={{ fontSize }}
      >
        Turn screenshots
      </Text>
      {/* App source icons in mini 9:16 dashed containers */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginVertical: 8,
        }}
      >
        {sources.map((s, i) => {
          const rotation = i % 2 === 0 ? "10deg" : "-10deg";
          const containerWidth = iconSize * 1.6;
          const containerHeight = containerWidth * (16 / 9);
          return (
            <View
              key={i}
              style={{
                width: containerWidth,
                height: containerHeight,
                borderRadius: 6,
                borderWidth: 1.5,
                borderColor: "#E0D9FF",
                borderStyle: "dashed",
                backgroundColor: "#FAFAFF",
                transform: [{ rotate: rotation }],
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Image
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                source={s.source}
                style={{
                  width: iconSize,
                  height: iconSize,
                  borderRadius: 5,
                  opacity: 0.6,
                  transform: [
                    { rotate: rotation === "10deg" ? "-10deg" : "10deg" },
                  ],
                }}
              />
            </View>
          );
        })}
      </View>
      <Animated.View entering={FadeInDown.delay(300).duration(500).springify()}>
        <Text
          className="text-center text-2xl font-bold text-neutral-1"
          style={{ fontSize, lineHeight: fontSize * 1.4 }}
        >
          into{" "}
          <Text style={{ color: "#5A32FB", fontFamily: "Kalam_700Bold" }}>
            possibilities
          </Text>
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

interface UserEventsListProps {
  // Either provide raw events (for backward compatibility with client-side grouping)
  events?: Event[];
  // Or provide pre-grouped events from server (for new server-side grouping)
  groupedEvents?: EventWithSimilarity[];
  ActionButton?: React.ComponentType<ActionButtonProps>;
  showCreator: ShowCreatorOption;
  onEndReached: () => void;
  isFetchingNextPage: boolean;
  isLoadingFirstPage?: boolean;
  showSourceStickers?: boolean;
  demoMode?: boolean;
  stats?: EventStatsData;
  hideDiscoverableButton?: boolean;
  isDiscoverFeed?: boolean;
  savedEventIds?: Set<string>;
  HeaderComponent?: React.ComponentType<Record<string, never>>;
  EmptyStateComponent?: React.ComponentType<Record<string, never>>;
  source?: string;
}

export default function UserEventsList(props: UserEventsListProps) {
  const {
    events,
    groupedEvents,
    ActionButton,
    showCreator,
    onEndReached,
    isFetchingNextPage,
    isLoadingFirstPage = false,
    showSourceStickers = false,
    demoMode,
    stats,
    hideDiscoverableButton = false,
    isDiscoverFeed = false,
    savedEventIds,
    HeaderComponent,
    EmptyStateComponent,
    source,
  } = props;
  const { user } = useUser();
  // Use pre-grouped events if provided, otherwise collapse client-side
  const collapsedEvents = useMemo(() => {
    if (groupedEvents) {
      // Server already grouped the events
      return groupedEvents;
    }
    // Fallback: client-side grouping for backward compatibility
    return events ? collapseSimilarEvents(events, user?.id) : [];
  }, [groupedEvents, events, user?.id]);

  const renderEmptyState = (inline = false) => {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: "#F4F1FF" }}
        contentContainerStyle={{
          paddingTop: inline ? 8 : 16,
          paddingBottom: 120,
          flexGrow: 1,
          backgroundColor: "#F4F1FF",
        }}
        showsVerticalScrollIndicator={false}
      >
        <EmptyStateHeader />
        {showSourceStickers && <SourceStickersRow />}
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
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: "#F4F1FF" }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#5A32FB" />
      </ScrollView>
    );
  }

  if (collapsedEvents.length === 0) {
    if (EmptyStateComponent) {
      return <EmptyStateComponent />;
    }
    if (!HeaderComponent) {
      return renderEmptyState();
    }
  }

  const renderFooter = () => {
    if (collapsedEvents.length === 0) return null;
    return (
      <>
        {isFetchingNextPage ? (
          <View className="py-4">
            <ActivityIndicator size="large" color="#5A32FB" />
          </View>
        ) : null}
        {showSourceStickers ? <ScreenshotCta /> : null}
      </>
    );
  };

  const renderHeader = () => {
    return (
      <>
        {HeaderComponent && <HeaderComponent />}
        {stats && (
          <EventStats
            capturesThisWeek={stats.capturesThisWeek ?? 0}
            weeklyGoal={stats.weeklyGoal ?? 0}
            upcomingEvents={stats.upcomingEvents ?? 0}
            allTimeEvents={stats.allTimeEvents ?? 0}
          />
        )}
        {/* when showing list items, add a bit of padding. not needed for empty state */}
        <View style={{ height: 16 }} />
      </>
    );
  };

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      data={collapsedEvents}
      keyExtractor={(item) => item.event.id}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={() => renderEmptyState(true)}
      renderItem={({ item, index }) => {
        const eventData = item.event;
        // Use savedEventIds if provided, otherwise check eventFollows
        const isSaved = savedEventIds
          ? savedEventIds.has(eventData.id)
          : (eventData.eventFollows?.some(
              (follow: { userId: string }) => follow.userId === user?.id,
            ) ?? false);
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
            isDiscoverFeed={isDiscoverFeed}
            source={source}
          />
        );
      }}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      style={{ backgroundColor: "#F4F1FF" }}
      contentContainerStyle={{
        paddingBottom: 120,
        flexGrow: 1,
        backgroundColor: "#F4F1FF",
      }}
      ListFooterComponent={renderFooter()}
    />
  );
}
