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
import { Link, router, Stack, useLocalSearchParams } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";

import type { EventMetadata } from "@soonlist/cal";
import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";
import { api } from "@soonlist/backend/convex/_generated/api";
import { getTimezoneAbbreviation } from "@soonlist/cal";

import { AttributionGrid } from "~/components/AttributionGrid";
import { EventMenu } from "~/components/EventMenu";
import {
  HeaderCloseButton,
  HeaderIconButton,
} from "~/components/HeaderIconButton";
import {
  CalendarPlus,
  EyeOff,
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
import { formatUrlForDisplay } from "../../../utils/links";

// Helper to get platform URL for mentions
function getPlatformUrl(
  platform: string | undefined,
  username: string,
): string {
  // Check if username is already a full URL
  const trimmedUsername = username.trim();
  if (
    trimmedUsername.toLowerCase().startsWith("http://") ||
    trimmedUsername.toLowerCase().startsWith("https://")
  ) {
    try {
      new URL(trimmedUsername);
      return trimmedUsername; // Return as-is if it's a valid URL
    } catch {
      // Invalid URL, continue with platform logic
    }
  }

  const cleanUsername = trimmedUsername.replace(/^@/, "");

  // Only return URLs for explicitly supported platforms
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
      return ""; // Return empty string for unsupported platforms
  }
}

export default function Page() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // key={id} ensures React unmounts/remounts EventDetail when id changes,
  // automatically resetting all state and refs without a useEffect.
  return <EventDetail key={id} id={id} />;
}

function EventDetail({ id }: { id: string }) {
  const { width } = Dimensions.get("window");
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useUser();

  // Store the aspect ratio for the main event image
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  // Track if we've already counted this event view to prevent multiple increments
  const hasCountedViewRef = useRef(false);

  const queryEvent = useQuery(api.events.get, { eventId: id });
  // Use cached event data from the list for instant rendering while Convex loads
  const cachedEvent = useMemo(() => (id ? getEventCache(id) : undefined), [id]);
  // Only fall back to cache while query is loading (undefined), not when query
  // returned null (event not found)
  const event = queryEvent !== undefined ? queryEvent : cachedEvent;
  const userTimezone = useUserTimezone();

  // Event view tracking
  const { customerInfo, showProPaywallIfNeeded } = useRevenueCat();
  const hasUnlimited =
    customerInfo?.entitlements.active.unlimited?.isActive ?? false;

  const incrementEventView = useIncrementEventView();
  const shouldShowViewPaywall = useShouldShowViewPaywall();
  const markPaywallShown = useMarkPaywallShown();

  // Track event view and show paywall if needed
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

  // Properly check if the event is saved by the current user
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

  // Handlers
  const handleDeleteAndRedirect = useCallback(async () => {
    await handleDelete();
    router.replace("/");
  }, [handleDelete]);

  // Pre-calculate the image URI for the event image
  const imageUri = useMemo(() => {
    if (!event?.event) return null;

    const eventData = event.event as AddToCalendarButtonPropsRestricted;
    const eventImage = eventData?.images?.[3];
    if (!eventImage) {
      return null;
    }
    return `${eventImage}?max-w=1284&fit=contain&f=webp&q=80`;
  }, [event?.event?.images]);

  // Thumbnail URI matching what the list items cache (used as a placeholder)
  const thumbnailUri = useMemo(() => {
    if (!event?.event) return null;

    const eventData = event.event as AddToCalendarButtonPropsRestricted;
    const eventImage = eventData?.images?.[3];
    if (!eventImage) return null;
    return `${eventImage}?w=160&h=160&fit=cover&f=webp&q=80`;
  }, [event?.event?.images]);

  // Build the header-right UI if we have data
  const HeaderRight = useCallback(() => {
    if (!event) return null;

    const isOwner = event.userId === currentUser?.id;

    return (
      <View className="flex-row items-center gap-4">
        <HeaderIconButton
          accessibilityLabel="Share event"
          onPress={() => void openShareSheet("event_detail")}
        >
          <ShareIcon size={18} color="#5A32FB" />
        </HeaderIconButton>
        <EventMenu
          event={event}
          isOwner={isOwner}
          isSaved={optimisticIsSaved}
          menuType="popup"
          onDelete={handleDeleteAndRedirect}
          iconColor="#5A32FB"
        >
          <HeaderIconButton accessibilityLabel="Event menu">
            <MoreVertical size={18} color="#5A32FB" />
          </HeaderIconButton>
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

  // Early return if the 'id' is missing or invalid
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

  // Loading state
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

  // Not found or error
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

  // Normal render
  const eventData = event.event as AddToCalendarButtonPropsRestricted;
  const isCurrentUserEvent = currentUser?.id === event.userId;

  // Normalize timezones for comparison
  const normalizeTimezone = (tz?: string): string => {
    if (!tz || tz === "unknown" || tz.trim() === "") return "";
    return tz.trim().toLowerCase();
  };

  const normalizedEventTz = normalizeTimezone(eventData.timeZone);
  const normalizedUserTz = normalizeTimezone(userTimezone);

  // Get timezone abbreviation if timezones differ
  const shouldShowTimezone =
    normalizedEventTz &&
    normalizedUserTz &&
    normalizedEventTz !== normalizedUserTz &&
    eventData.startTime; // Only show for timed events

  const timezoneAbbreviation = shouldShowTimezone
    ? getTimezoneAbbreviation(eventData.timeZone || "")
    : undefined;

  // Compute event date/time strings
  const { date, time, eventTime } = formatEventDateRange(
    eventData.startDate || "",
    eventData.startTime,
    eventData.endTime,
    eventData.timeZone || "",
    timezoneAbbreviation,
  );

  // Determine primary and secondary actions
  const showSaveButton = true;
  // Owners of the event always see "Saved" state (they already have it in
  // their list by virtue of creating it); non-owners see live local state.
  const displayIsSaved = isCurrentUserEvent || optimisticIsSaved;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: HeaderRight,
          headerLeft: ({ tintColor }) => (
            <HeaderCloseButton tintColor={tintColor} />
          ),
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
          {/* Date + title */}
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

          {/* Meta rows */}
          {(eventData.location || event.visibility === "private") && (
            <View className="mt-4 flex-col gap-3">
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
              {event.visibility === "private" ? (
                <View className="flex-row items-center">
                  <EyeOff size={16} color="#627496" />
                  <Text className="ml-1 text-neutral-2">Private</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Description */}
          <View className="mb-3 mt-6">
            <Text className="text-neutral-1">{eventData.description}</Text>
          </View>

          {/* Metadata Section */}
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

          {/* Attribution grid — unified attribution of people + lists.
              Lives after the event content and source attribution so the
              reading order is: what it is → what it's about → where it
              came from → who has it. */}
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

          {/* Hidden probe to detect image dimensions without layout shift */}
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

          {/* Main Event Image - only rendered once we know the real aspect ratio */}
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

      {/* Floating Action Buttons */}
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
