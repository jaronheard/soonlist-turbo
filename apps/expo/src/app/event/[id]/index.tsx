import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dimensions,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import {
  Link,
  router,
  Stack,
  useLocalSearchParams,
  useNavigation,
} from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";

import type { EventMetadata } from "@soonlist/cal";
import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";
import { api } from "@soonlist/backend/convex/_generated/api";
import { getTimezoneAbbreviation } from "@soonlist/cal";

import { AttributionGrid } from "~/components/AttributionGrid";
import { EventMenu } from "~/components/EventMenu";
import { HeaderLogo } from "~/components/HeaderLogo";
import {
  CalendarPlus,
  EyeOff,
  Globe2,
  Heart,
  Instagram,
  MapPinned,
  MoreVertical,
  ShareIcon,
} from "~/components/icons";
import LoadingSpinner from "~/components/LoadingSpinner";
import { useEventActions, useEventSaveActions } from "~/hooks/useEventActions";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import {
  useIncrementEventView,
  useMarkPaywallShown,
  useShouldShowViewPaywall,
  useUserTimezone,
} from "~/store";
import { AF_EVENTS, trackAFEvent } from "~/utils/appsflyerEvents";
import { formatEventDateRange } from "~/utils/dates";
import { getEventCache } from "~/utils/eventCache";
import { eventFollowsToSavers } from "~/utils/eventFollows";
import { getPlanStatusFromUser } from "~/utils/plan";
import { formatUrlForDisplay } from "../../../utils/links";

function getPlatformUrl(
  platform: string | undefined,
  username: string,
): string {
  const trimmedUsername = username.trim();
  if (
    trimmedUsername.toLowerCase().startsWith("http://") ||
    trimmedUsername.toLowerCase().startsWith("https://")
  ) {
    try {
      new URL(trimmedUsername);
      return trimmedUsername;
    } catch {
      // Invalid URL, continue with platform logic
    }
  }

  const cleanUsername = trimmedUsername.replace(/^@/, "");

  switch (platform?.toLowerCase()) {
    case "tiktok":
      return `https://tiktok.com/@${cleanUsername}`;
    case "twitter":
      return `https://twitter.com/${cleanUsername}`;
    case "facebook":
      return `https://facebook.com/${cleanUsername}`;
    case "instagram":
      return `https://instagram.com/${cleanUsername}`;
    default:
      return "";
  }
}

const headerButtonStyle = {
  width: 36,
  height: 36,
  borderRadius: 18,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  backgroundColor: "#FFFFFF",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 2,
};

export default function Page() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <EventDetail key={id} id={id} />;
}

function EventDetail({ id }: { id: string }) {
  const { width } = Dimensions.get("window");
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useUser();
  const navigation = useNavigation();
  const showDiscover = currentUser
    ? getPlanStatusFromUser(currentUser).showDiscover
    : false;

  const canGoBack = navigation.canGoBack();

  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const hasCountedViewRef = useRef(false);

  const queryEvent = useQuery(api.events.get, { eventId: id });
  const cachedEvent = useMemo(() => (id ? getEventCache(id) : undefined), [id]);
  const event = queryEvent !== undefined ? queryEvent : cachedEvent;
  const userTimezone = useUserTimezone();

  const { customerInfo, showProPaywallIfNeeded } = useRevenueCat();
  const hasUnlimited =
    customerInfo?.entitlements.active.unlimited?.isActive ?? false;

  const incrementEventView = useIncrementEventView();
  const shouldShowViewPaywall = useShouldShowViewPaywall();
  const markPaywallShown = useMarkPaywallShown();

  useEffect(() => {
    if (event && !hasUnlimited && !hasCountedViewRef.current) {
      hasCountedViewRef.current = true;

      incrementEventView();
      trackAFEvent(AF_EVENTS.CONTENT_VIEW, {
        af_content_id: id,
        af_content_type: "event",
      });

      if (shouldShowViewPaywall()) {
        void showProPaywallIfNeeded()
          .then(() => {
            markPaywallShown();
          })
          .catch((error) => {
            console.error("Failed to show paywall:", error);
          });
      }
    }
  }, [event, hasUnlimited, showProPaywallIfNeeded, customerInfo]);

  const isSaved =
    event && currentUser
      ? event.eventFollows.some((follow) => follow.userId === currentUser.id)
      : false;

  const { handleDelete, handleAddToCal } = useEventActions({
    event,
    isSaved,
    source: "event_detail",
  });

  const {
    isSaved: optimisticIsSaved,
    toggle: toggleSave,
    openShareSheet,
  } = useEventSaveActions(event?.id ?? "", isSaved, {
    source: "event_detail",
  });

  const handleDeleteAndRedirect = useCallback(async () => {
    await handleDelete();
    router.replace("/");
  }, [handleDelete]);

  const imageUri = useMemo(() => {
    if (!event?.event) return null;

    const eventData = event.event as AddToCalendarButtonPropsRestricted;
    const eventImage = eventData?.images?.[3];
    if (!eventImage) {
      return null;
    }
    return `${eventImage}?max-w=1284&fit=contain&f=webp&q=80`;
  }, [event?.event?.images]);

  const thumbnailUri = useMemo(() => {
    if (!event?.event) return null;

    const eventData = event.event as AddToCalendarButtonPropsRestricted;
    const eventImage = eventData?.images?.[3];
    if (!eventImage) return null;
    return `${eventImage}?w=160&h=160&fit=cover&f=webp&q=80`;
  }, [event?.event?.images]);

  const HeaderLeft = useCallback(() => {
    if (!canGoBack) {
      return <HeaderLogo />;
    }
    return null;
  }, [canGoBack]);

  const HeaderRight = useCallback(() => {
    if (!event) return null;

    const isOwner = event.userId === currentUser?.id;

    return (
      <View className="flex-row items-center gap-4">
        <TouchableOpacity
          onPress={() => void openShareSheet("event_detail")}
          accessibilityLabel="Share event"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={headerButtonStyle}
        >
          <ShareIcon size={18} color="#5A32FB" />
        </TouchableOpacity>
        <EventMenu
          event={event}
          isOwner={isOwner}
          isSaved={optimisticIsSaved}
          menuType="popup"
          onDelete={handleDeleteAndRedirect}
          iconColor="#5A32FB"
        >
          <TouchableOpacity
            activeOpacity={0.6}
            accessibilityLabel="Event menu"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={headerButtonStyle}
          >
            <MoreVertical size={18} color="#5A32FB" />
          </TouchableOpacity>
        </EventMenu>
      </View>
    );
  }, [
    event,
    optimisticIsSaved,
    currentUser?.id,
    handleDeleteAndRedirect,
    openShareSheet,
  ]);

  if (!id || typeof id !== "string") {
    return (
      <>
        <Stack.Screen
          options={{
            headerTransparent: true,
            headerTintColor: "#5A32FB",
            headerTitleStyle: { color: "#5A32FB" },
            headerRight: () => null,
          }}
        />
        <View
          className="flex-1 bg-white"
          style={{ paddingTop: insets.top + 56 }}
        >
          <Text>Invalid or missing event id</Text>
        </View>
      </>
    );
  }

  if (event === undefined) {
    return (
      <>
        <Stack.Screen
          options={{
            headerTransparent: true,
            headerTintColor: "#5A32FB",
            headerTitleStyle: { color: "#5A32FB" },
            headerRight: () => null,
          }}
        />
        <View
          className="flex-1 bg-white"
          style={{ paddingTop: insets.top + 56 }}
        >
          <LoadingSpinner />
        </View>
      </>
    );
  }

  if (event === null) {
    return (
      <>
        <Stack.Screen
          options={{
            headerTransparent: true,
            headerTintColor: "#5A32FB",
            headerTitleStyle: { color: "#5A32FB" },
            headerRight: () => null,
          }}
        />
        <View
          className="flex-1 bg-white"
          style={{ paddingTop: insets.top + 56 }}
        >
          <Text>Event not found</Text>
        </View>
      </>
    );
  }

  const eventData = event.event as AddToCalendarButtonPropsRestricted;
  const isCurrentUserEvent = currentUser?.id === event.userId;

  const normalizeTimezone = (tz?: string): string => {
    if (!tz || tz === "unknown" || tz.trim() === "") return "";
    return tz.trim().toLowerCase();
  };

  const normalizedEventTz = normalizeTimezone(eventData.timeZone);
  const normalizedUserTz = normalizeTimezone(userTimezone);

  const shouldShowTimezone =
    normalizedEventTz &&
    normalizedUserTz &&
    normalizedEventTz !== normalizedUserTz &&
    eventData.startTime;

  const timezoneAbbreviation = shouldShowTimezone
    ? getTimezoneAbbreviation(eventData.timeZone || "")
    : undefined;

  const { date, time, eventTime } = formatEventDateRange(
    eventData.startDate || "",
    eventData.startTime,
    eventData.endTime,
    eventData.timeZone || "",
    timezoneAbbreviation,
  );

  const showSaveButton = true;
  const displayIsSaved = isCurrentUserEvent || optimisticIsSaved;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: HeaderRight,
          headerLeft: !canGoBack ? HeaderLeft : undefined,
          headerTransparent: true,
          headerTintColor: "#5A32FB",
          headerTitleStyle: { color: "#5A32FB" },
        }}
      />
      <ScrollView
        className="flex-1 bg-white"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingBottom: insets.bottom + 36,
        }}
        maximumZoomScale={5}
      >
        <View className="p-4">
          <View className="flex flex-col gap-2">
            <View>
              <Text className="text-lg font-medium text-neutral-2">
                {date}
                {time ? ` • ${time}` : ""}
                {eventTime && (
                  <>
                    {" "}
                    <Text style={{ fontStyle: "italic" }}>{eventTime}</Text>
                  </>
                )}
              </Text>
            </View>
            <Text className="font-heading text-3xl font-bold text-neutral-1">
              {eventData.name}
            </Text>
          </View>

          {(eventData.location || (showDiscover && isCurrentUserEvent)) && (
            <View className="mt-4 flex flex-col gap-2">
              {eventData.location && (
                <Link
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    eventData.location,
                  )}`}
                  asChild
                >
                  <Pressable>
                    <View className="flex-row items-center">
                      <MapPinned size={16} color="#5A32FB" />
                      <Text className="ml-1 text-interactive-1">
                        {eventData.location}
                      </Text>
                    </View>
                  </Pressable>
                </Link>
              )}

              {showDiscover && isCurrentUserEvent && (
                <View className="flex-row items-center gap-2">
                  {event.visibility === "public" ? (
                    <Globe2 size={16} color="#627496" />
                  ) : (
                    <EyeOff size={16} color="#627496" />
                  )}
                  <Text className="text-sm text-neutral-2">
                    {event.visibility === "public"
                      ? "Discoverable"
                      : "Not discoverable"}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View className="mb-3 mt-6">
            <Text className="text-neutral-1">{eventData.description}</Text>
          </View>

          {event.eventMetadata && (
            <>
              {(() => {
                const eventMetadata = event.eventMetadata as EventMetadata;
                const sourceUrls = eventMetadata.sourceUrls || [];
                const hasSourceUrls = sourceUrls.length > 0;
                const hasMentions = !!(
                  eventMetadata.mentions && eventMetadata.mentions.length > 0
                );
                const mentions = eventMetadata.mentions || [];
                const firstMentionCandidate = hasMentions
                  ? mentions[0]
                  : undefined;
                const isInstagram = eventMetadata.platform === "instagram";

                if (!hasSourceUrls && !hasMentions) return null;

                return (
                  <View className="mb-6 flex-row flex-wrap items-center gap-1">
                    {hasSourceUrls && (
                      <>
                        <Text className="text-sm text-neutral-2">link:</Text>
                        {sourceUrls.map((url, index) => (
                          <React.Fragment key={`${url}-${index}`}>
                            <Pressable
                              onPress={() => {
                                if (/^https?:\/\//i.test(url)) {
                                  void Linking.openURL(url);
                                }
                              }}
                            >
                              <Text className="break-all text-sm text-interactive-1">
                                {formatUrlForDisplay(url)}
                              </Text>
                            </Pressable>
                            {index < sourceUrls.length - 1 && (
                              <Text className="text-sm text-neutral-2">, </Text>
                            )}
                          </React.Fragment>
                        ))}
                        {hasMentions && (
                          <Text className="mx-1 text-sm text-neutral-2">•</Text>
                        )}
                      </>
                    )}

                    {hasMentions && firstMentionCandidate && (
                      <>
                        <Text className="text-sm text-neutral-2">via</Text>
                        <Pressable
                          onPress={() => {
                            const url = getPlatformUrl(
                              eventMetadata.platform,
                              firstMentionCandidate,
                            );
                            if (url) {
                              void Linking.openURL(url);
                            }
                          }}
                        >
                          <View className="flex-row items-center gap-0.5">
                            {isInstagram && (
                              <Instagram
                                className="mt-[3px] flex-shrink-0"
                                color="#5A32FB"
                                size={12}
                              />
                            )}
                            <Text className="text-sm text-interactive-1">
                              {firstMentionCandidate}
                            </Text>
                          </View>
                        </Pressable>
                        {mentions.length > 1 && (
                          <>
                            <Text className="text-sm text-neutral-2">with</Text>
                            {mentions.slice(1).map((mention, index) => (
                              <View
                                key={mention}
                                className="flex-row items-center"
                              >
                                <Pressable
                                  onPress={() => {
                                    const url = getPlatformUrl(
                                      eventMetadata.platform,
                                      mention,
                                    );
                                    if (url) {
                                      void Linking.openURL(url);
                                    }
                                  }}
                                >
                                  <View className="flex-row items-center gap-0.5">
                                    {isInstagram && (
                                      <Instagram
                                        className="mt-[3px] flex-shrink-0"
                                        color="#5A32FB"
                                        size={12}
                                      />
                                    )}
                                    <Text className="text-sm text-interactive-1">
                                      {mention}
                                    </Text>
                                  </View>
                                </Pressable>
                                {index <
                                  (eventMetadata.mentions || []).length - 2 && (
                                  <Text className="text-sm text-neutral-2">
                                    ,{" "}
                                  </Text>
                                )}
                              </View>
                            ))}
                          </>
                        )}
                      </>
                    )}
                  </View>
                );
              })()}
            </>
          )}

          {event.user && (
            <View className="mb-4">
              <AttributionGrid
                creator={{
                  id: event.user.id,
                  username: event.user.username,
                  displayName: event.user.displayName,
                  userImage: event.user.userImage,
                }}
                savers={eventFollowsToSavers(event.eventFollows)}
                lists={event.lists}
                currentUserId={currentUser?.id}
                variant="compact"
              />
            </View>
          )}

          {imageUri && !imageAspectRatio && (
            <ExpoImage
              source={{ uri: imageUri }}
              style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
              onLoad={(e) => {
                setImageAspectRatio(
                  e.source.height > 0
                    ? e.source.width / e.source.height
                    : 4 / 3,
                );
              }}
              onError={() => {
                setImageAspectRatio(4 / 3);
              }}
              cachePolicy="memory-disk"
              priority="high"
            />
          )}

          {imageUri && imageAspectRatio && (
            <View
              className="mb-4 overflow-hidden"
              style={{
                width: width - 32,
                aspectRatio: imageAspectRatio,
              }}
            >
              <ExpoImage
                source={{ uri: imageUri }}
                placeholder={thumbnailUri ? { uri: thumbnailUri } : undefined}
                placeholderContentFit="cover"
                style={{ width: "100%", height: "100%" }}
                contentFit="contain"
                contentPosition="center"
                transition={200}
                cachePolicy="memory-disk"
                priority="high"
              />
            </View>
          )}
        </View>
      </ScrollView>

      <View
        className="absolute bottom-8 flex-row items-center justify-center gap-4 self-center"
        style={{
          shadowColor: "#5A32FB",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 8,
        }}
      >
        {showSaveButton && (
          <TouchableOpacity
            onPress={toggleSave}
            disabled={isCurrentUserEvent}
            accessibilityLabel={
              displayIsSaved ? "Saved, double-tap to remove" : "Save Event"
            }
            accessibilityRole="button"
            activeOpacity={0.8}
          >
            <View
              className="flex-row items-center justify-center gap-4 rounded-full bg-interactive-1 px-8 py-5"
              style={{ minWidth: 168 }}
            >
              <Heart
                size={28}
                color="#FFFFFF"
                fill={displayIsSaved ? "#FFFFFF" : "transparent"}
              />
              <Text className="text-xl font-bold text-white">
                {displayIsSaved ? "Saved" : "Save"}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleAddToCal}
          accessibilityLabel="Add to Calendar"
          accessibilityRole="button"
          activeOpacity={0.8}
        >
          <View className="flex-row items-center justify-center gap-4 rounded-full bg-interactive-2 px-8 py-5">
            <CalendarPlus size={28} color="#5A32FB" />
            <Text className="text-xl font-bold text-interactive-1">Add</Text>
          </View>
        </TouchableOpacity>
      </View>
    </>
  );
}
