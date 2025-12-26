import type { FunctionReturnType } from "convex/server";
import type { ViewStyle } from "react-native";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

import type { api } from "@soonlist/backend/convex/_generated/api";
import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";
import { getTimezoneAbbreviation } from "@soonlist/cal";

import {
  CalendarPlus,
  Copy,
  EyeOff,
  Globe2,
  MoreVertical,
  PlusIcon,
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
      router.push(`/user/${user.username}`);
    }
  };

  // Format names text
  const getNamesText = () => {
    const names = displayUsers.map(
      (u) => u.displayName || u.username || "unknown",
    );
    if (names.length === 1) {
      return names[0];
    }
    if (remainingCount > 0) {
      return `${names.join(", ")} +${remainingCount} more`;
    }
    return names.join(", ");
  };

  const avatarSize = iconSize * 1.1;
  const overlap = avatarSize * 0.3;

  return (
    <View className="mx-auto mt-1 flex-row items-center gap-2">
      {/* Stacked avatars */}
      <Pressable
        className="flex-row items-center"
        onPress={() => displayUsers[0] && handleUserPress(displayUsers[0])}
        style={{
          width:
            avatarSize + (displayUsers.length - 1) * (avatarSize - overlap),
        }}
      >
        {displayUsers.map((user, index) => (
          <Pressable
            key={user.id}
            onPress={() => handleUserPress(user)}
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
      </Pressable>

      {/* Names text */}
      <Pressable
        onPress={() => displayUsers[0] && handleUserPress(displayUsers[0])}
      >
        <Text className="text-xs text-neutral-2">{getNamesText()}</Text>
      </Pressable>
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
            router.navigate(`/onboarding/demo-event/${id}`);
          } else {
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

              {!isDiscoverFeed && (
                <TouchableOpacity
                  className="-mb-0.5 -ml-2.5 flex-row items-center gap-2 bg-interactive-2 px-4 py-2.5"
                  style={{ borderRadius: 16 }}
                  onPress={handleShare}
                  accessibilityLabel="Share"
                  accessibilityRole="button"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <ShareIcon size={iconSize * 1.1} color="#5A32FB" />
                  <Text className="text-base font-bold text-interactive-1">
                    Share
                  </Text>
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

              <TouchableOpacity
                className="rounded-full p-2.5"
                onPress={handleAddToCal}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <CalendarPlus size={iconSize * 1.1} color="#5A32FB" />
              </TouchableOpacity>

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

interface SourceStickerProps {
  icon: React.ReactNode;
  label: string;
  index: number;
  deepLink?: string;
}

const SourceSticker = ({
  icon,
  label,
  index,
  deepLink,
}: SourceStickerProps) => {
  const { fontScale } = useWindowDimensions();
  const rotation = index % 2 === 0 ? "8deg" : "-8deg";

  const handlePress = async () => {
    if (!deepLink) return;

    try {
      const canOpen = await Linking.canOpenURL(deepLink);
      if (canOpen) {
        await Linking.openURL(deepLink);
      }
    } catch {
      // Silently fail if app can't be opened
    }
  };

  const content = (
    <View
      style={{
        transform: [{ rotate: rotation }],
        shadowColor: "#5A32FB",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <View
        className="items-center rounded-xl bg-white px-3 py-2"
        style={{
          borderWidth: 2,
          borderColor: "#E0D9FF",
          minWidth: 70 * fontScale,
        }}
      >
        <View
          style={{
            width: 24 * fontScale,
            height: 24 * fontScale,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </View>
        <Text
          className="mt-1 text-center text-xs font-medium text-neutral-2"
          style={{ fontSize: 11 * fontScale }}
        >
          {label}
        </Text>
      </View>
    </View>
  );

  if (deepLink) {
    return (
      <TouchableOpacity onPress={() => void handlePress()} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const SourceStickersRow = ({ hideText = false }: { hideText?: boolean }) => {
  const { fontScale } = useWindowDimensions();
  const iconSize = 24 * fontScale;

  const row1 = [
    {
      icon: (
        <Image
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
          source={require("../assets/app-icons/instagram.png")}
          style={{ width: iconSize, height: iconSize, borderRadius: 5 }}
        />
      ),
      label: "Instagram",
      deepLink: "instagram://",
    },
    {
      icon: (
        <Image
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
          source={require("../assets/app-icons/tiktok.png")}
          style={{ width: iconSize, height: iconSize, borderRadius: 5 }}
        />
      ),
      label: "TikTok",
      deepLink: "tiktok://",
    },
    {
      icon: (
        <Image
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
          source={require("../assets/app-icons/messages.png")}
          style={{ width: iconSize, height: iconSize, borderRadius: 5 }}
        />
      ),
      label: "Messages",
      deepLink: "sms:",
    },
    {
      icon: (
        <Image
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
          source={require("../assets/app-icons/partiful.png")}
          style={{ width: iconSize, height: iconSize, borderRadius: 5 }}
        />
      ),
      label: "Partiful",
      deepLink: "partiful://",
    },
  ];

  const row2 = [
    {
      icon: (
        <Image
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
          source={require("../assets/app-icons/mail.png")}
          style={{ width: iconSize, height: iconSize, borderRadius: 5 }}
        />
      ),
      label: "Email",
      deepLink: "mailto:",
    },
    {
      icon: (
        <Image
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
          source={require("../assets/app-icons/safari.png")}
          style={{ width: iconSize, height: iconSize, borderRadius: 5 }}
        />
      ),
      label: "Safari",
      deepLink: "https://soonlist.com",
    },
    {
      icon: (
        <Image
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
          source={require("../assets/app-icons/posters.png")}
          style={{ width: iconSize, height: iconSize, borderRadius: 5 }}
        />
      ),
      label: "Posters",
      // No deep link for physical posters
    },
  ];

  return (
    <View className="mb-6 px-4">
      {!hideText && (
        <View className="mb-4">
          <TapToAddText textSize={16} />
        </View>
      )}
      <View className="flex-row flex-wrap items-center justify-center gap-3">
        {row1.map((source, index) => (
          <SourceSticker
            key={source.label}
            icon={source.icon}
            label={source.label}
            index={index}
            deepLink={source.deepLink}
          />
        ))}
      </View>
      <View className="mt-3 flex-row flex-wrap items-center justify-center gap-3">
        {row2.map((source, index) => (
          <SourceSticker
            key={source.label}
            icon={source.icon}
            label={source.label}
            index={index + 1}
            deepLink={source.deepLink}
          />
        ))}
      </View>
    </View>
  );
};

const TapToAddText = ({ textSize = 16 }: { textSize?: number }) => {
  const { fontScale } = useWindowDimensions();
  const fontSize = textSize * fontScale;
  const iconSize = 20 * fontScale;
  const plusIconSize = 12 * fontScale;

  return (
    <View className="flex-row items-center justify-center">
      <Text className="text-center text-neutral-2" style={{ fontSize }}>
        Tap
      </Text>
      <View
        className="mx-1.5 items-center justify-center rounded-full bg-interactive-1"
        style={{
          width: iconSize,
          height: iconSize,
        }}
      >
        <PlusIcon size={plusIconSize} color="#FFF" strokeWidth={3} />
      </View>
      <Text className="text-center text-neutral-2" style={{ fontSize }}>
        to add from screenshots or photos
      </Text>
    </View>
  );
};

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
      <TapToAddText textSize={16} />
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
  showSourceStickers?: boolean;
  demoMode?: boolean;
  stats?: EventStatsData;
  hideDiscoverableButton?: boolean;
  isDiscoverFeed?: boolean;
  savedEventIds?: Set<string>;
  HeaderComponent?: React.ComponentType<Record<string, never>>;
  source?: string;
}

export default function UserEventsList(props: UserEventsListProps) {
  const {
    events,
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
    source,
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
        {showSourceStickers && <SourceStickersRow hideText />}
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
      {showSourceStickers ? <SourceStickersRow /> : null}
    </>
  );

  const renderHeader = () => {
    if (!HeaderComponent && !stats) return null;
    return (
      <View>
        {HeaderComponent && <HeaderComponent />}
        {stats && (
          <EventStats
            capturesThisWeek={stats.capturesThisWeek ?? 0}
            weeklyGoal={stats.weeklyGoal ?? 0}
            upcomingEvents={stats.upcomingEvents ?? 0}
            allTimeEvents={stats.allTimeEvents ?? 0}
          />
        )}
      </View>
    );
  };

  return (
    <>
      <FlatList
        data={collapsedEvents}
        keyExtractor={(item) => item.event.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        renderItem={({ item, index }) => {
          const eventData = item.event;
          // Use savedEventIds if provided, otherwise check eventFollows
          const isSaved = savedEventIds
            ? savedEventIds.has(eventData.id)
            : (eventData.eventFollows?.some(
                (follow) => follow.userId === user?.id,
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
          paddingTop: stats ? 0 : 16,
          paddingBottom: 120,
          flexGrow: 1,
          backgroundColor: "#F4F1FF",
        }}
        ListFooterComponent={renderFooter()}
        ListFooterComponentStyle={{ flex: 1, justifyContent: "center" }}
      />
    </>
  );
}
