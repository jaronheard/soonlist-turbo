import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  Image as RNImage,
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

import { EventMenu } from "~/components/EventMenu";
import { HeaderLogo } from "~/components/HeaderLogo";
import {
  CalendarPlus,
  EyeOff,
  Globe2,
  Heart,
  MapPinned,
  ShareIcon,
  User,
} from "~/components/icons";
import LoadingSpinner from "~/components/LoadingSpinner";
import { UserProfileFlair } from "~/components/UserProfileFlair";
import { useEventActions } from "~/hooks/useEventActions";
import { useRevenueCat } from "~/providers/RevenueCatProvider";
import {
  useIncrementEventView,
  useMarkPaywallShown,
  useShouldShowViewPaywall,
} from "~/store";
import { cn } from "~/utils/cn";
import { formatEventDateRange } from "~/utils/dates";
import { getPlanStatusFromUser } from "~/utils/plan";
import { logError } from "../../../utils/errorLogging";

export default function Page() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = Dimensions.get("window");
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useUser();
  const navigation = useNavigation();
  const showDiscover = currentUser
    ? getPlanStatusFromUser(currentUser).showDiscover
    : false;

  // Check if we can go back in the navigation stack
  const canGoBack = navigation.canGoBack();

  // Store the aspect ratio for the main event image
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  // Track whether the image is fully loaded (for a fade-in)
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  // Track if we've already counted this event view to prevent multiple increments
  const hasCountedViewRef = useRef(false);

  const event = useQuery(api.events.get, { eventId: id });

  // Event view tracking
  const { customerInfo, showProPaywallIfNeeded } = useRevenueCat();
  const hasUnlimited =
    customerInfo?.entitlements.active.unlimited?.isActive ?? false;

  // Reset view count tracking when event ID changes
  useEffect(() => {
    hasCountedViewRef.current = false;
  }, [id]);

  const incrementEventView = useIncrementEventView();
  const shouldShowViewPaywall = useShouldShowViewPaywall();
  const markPaywallShown = useMarkPaywallShown();

  // Track event view and show paywall if needed
  useEffect(() => {
    if (event && !hasUnlimited && !hasCountedViewRef.current) {
      hasCountedViewRef.current = true;

      incrementEventView();

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

  const { handleDelete, handleShare, handleAddToCal, handleFollow } =
    useEventActions({
      event,
      isSaved,
    });

  // Handlers
  const handleDeleteAndRedirect = useCallback(async () => {
    await handleDelete();
    router.replace("/");
  }, [handleDelete]);

  // Pre-calculate the aspect ratio of the event image, if it exists
  useEffect(() => {
    if (!event?.event) return;

    const eventData = event.event as AddToCalendarButtonPropsRestricted;
    const eventImage = eventData?.images?.[3];
    if (!eventImage) {
      return;
    }
    const imageUri = `${eventImage}?max-w=1284&fit=cover&f=webp&q=80`;

    // Use RNImage to get actual width/height of the remote image
    RNImage.getSize(
      imageUri,
      (naturalWidth, naturalHeight) => {
        setImageAspectRatio(naturalWidth / naturalHeight);
      },
      (err) => {
        logError("Failed to get image size", err);
      },
    );
  }, [event?.event]);

  // Build the header-left UI if we can't go back
  const HeaderLeft = useCallback(() => {
    if (!canGoBack) {
      return <HeaderLogo />;
    }
    return null;
  }, [canGoBack]);

  // Build the header-right UI if we have data
  const HeaderRight = useCallback(() => {
    if (!event) return null;

    const isOwner = event.userId === currentUser?.id;

    return (
      <View className="flex-row items-center gap-2">
        <EventMenu
          event={event}
          isOwner={isOwner}
          isSaved={isSaved}
          menuType="popup"
          onDelete={handleDeleteAndRedirect}
        />
      </View>
    );
  }, [event, isSaved, currentUser?.id, handleDeleteAndRedirect]);

  // Early return if the 'id' is missing or invalid
  if (!id || typeof id !== "string") {
    return (
      <>
        <Stack.Screen options={{ headerRight: () => null }} />
        <View className="flex-1 bg-white">
          <Text>Invalid or missing event id</Text>
        </View>
      </>
    );
  }

  // Loading state
  if (event === undefined) {
    return (
      <>
        <Stack.Screen options={{ headerRight: () => null }} />
        <View className="flex-1 bg-white">
          <LoadingSpinner />
        </View>
      </>
    );
  }

  // Not found or error
  if (event === null) {
    return (
      <>
        <Stack.Screen options={{ headerRight: () => null }} />
        <View className="flex-1 bg-white">
          <Text>Event not found</Text>
        </View>
      </>
    );
  }

  // Normal render
  const eventData = event.event as AddToCalendarButtonPropsRestricted;
  const isCurrentUserEvent = currentUser?.id === event.userId;

  // Compute event date/time strings
  const { date, time } = formatEventDateRange(
    eventData.startDate || "",
    eventData.startTime,
    eventData.endTime,
    eventData.timeZone || "",
  );

  // Determine primary and secondary actions
  const showSaveButton = !isCurrentUserEvent && !isSaved;
  const showShareButton = isCurrentUserEvent || isSaved;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: HeaderRight,
          headerLeft: !canGoBack ? HeaderLeft : undefined,
        }}
      />
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{
          paddingBottom: insets.bottom + 36,
        }}
        maximumZoomScale={5}
      >
        <View className="p-4">
          <View className="flex flex-col gap-5">
            <View>
              <Text className="text-lg text-neutral-2">{date}</Text>
              <Text className="text-lg text-neutral-2">{time}</Text>
            </View>
            <Text className="font-heading text-4xl font-bold text-neutral-1">
              {eventData.name}
            </Text>

            {/* Location link */}
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

            {/* Visibility or user info */}
            {showDiscover && (
              <>
                {isCurrentUserEvent ? (
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
                ) : (
                  <View className="flex-row items-center gap-2">
                    <UserProfileFlair
                      username={event.user?.username || ""}
                      size="xs"
                    >
                      {event.user?.userImage ? (
                        <ExpoImage
                          source={{ uri: event.user.userImage }}
                          style={{ width: 20, height: 20, borderRadius: 10 }}
                          contentFit="cover"
                          contentPosition="center"
                          cachePolicy="disk"
                          transition={100}
                        />
                      ) : (
                        <User size={20} color="#627496" />
                      )}
                    </UserProfileFlair>
                    <Text className="text-sm text-neutral-2">
                      {event.user?.displayName ||
                        event.user?.username ||
                        "unknown"}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Description */}
          <View className="my-8">
            <Text className="text-neutral-1">{eventData.description}</Text>
          </View>

          {/* Event Source Metadata */}
          {event.eventMetadata && (
            <View className="mb-6 rounded-lg bg-neutral-4/5 p-4">
              {(() => {
                const metadata = event.eventMetadata as EventMetadata;
                const hasPlatform =
                  metadata.platform && metadata.platform !== "unknown";
                const hasMentions =
                  metadata.mentions && metadata.mentions.length > 0;
                const hasUrls =
                  metadata.sourceUrls && metadata.sourceUrls.length > 0;

                // Only show the section if there's actual metadata
                if (!hasPlatform && !hasMentions && !hasUrls) return null;

                return (
                  <>
                    {/* Platform */}
                    {hasPlatform && (
                      <View className="mb-3">
                        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-2">
                          Platform
                        </Text>
                        <Text className="mt-1 capitalize text-neutral-1">
                          {metadata.platform}
                        </Text>
                      </View>
                    )}

                    {/* Instagram/Social Media Mentions */}
                    {hasMentions && (
                      <View className="mb-3">
                        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-2">
                          Posted by
                        </Text>
                        <View className="mt-2 flex-row flex-wrap gap-2">
                          {metadata.mentions?.map((username, index) => (
                            <Link
                              key={username}
                              href={`https://instagram.com/${username}`}
                              asChild
                            >
                              <Pressable>
                                <View
                                  className={cn(
                                    "rounded-full px-3 py-2",
                                    index === 0
                                      ? "bg-interactive-1" // Main author - highlight
                                      : "bg-neutral-3",
                                  )}
                                >
                                  <Text
                                    className={cn(
                                      "text-sm font-medium",
                                      index === 0
                                        ? "text-white"
                                        : "text-neutral-1",
                                    )}
                                  >
                                    @{username}
                                  </Text>
                                </View>
                              </Pressable>
                            </Link>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Source URLs */}
                    {hasUrls && (
                      <View>
                        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-2">
                          Links
                        </Text>
                        <View className="mt-2 gap-2">
                          {metadata.sourceUrls?.map((url) => (
                            <Link key={url} href={url} asChild>
                              <Pressable>
                                <Text
                                  className="text-sm text-interactive-1 underline"
                                  numberOfLines={1}
                                >
                                  {url}
                                </Text>
                              </Pressable>
                            </Link>
                          ))}
                        </View>
                      </View>
                    )}
                  </>
                );
              })()}
            </View>
          )}

          {/* Main Event Image if it exists and aspect ratio is known */}
          {eventData.images?.[3] && imageAspectRatio && (
            <View
              className="mb-4 overflow-hidden bg-muted/10"
              style={{
                width: width - 32,
                // Maintain the original aspect ratio at the full width
                aspectRatio: imageAspectRatio,
              }}
            >
              <ExpoImage
                source={{
                  uri: `${eventData.images[3]}?max-w=1284&fit=contain&f=webp&q=80`,
                }}
                style={{ width: "100%", height: "100%" }}
                contentFit="contain"
                contentPosition="center"
                transition={200}
                cachePolicy="memory-disk"
                onLoadEnd={() => setIsImageLoaded(true)}
                className={isImageLoaded ? "opacity-100" : "opacity-0"}
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
        <TouchableOpacity
          onPress={handleAddToCal}
          accessibilityLabel="Add to Calendar"
          accessibilityRole="button"
          activeOpacity={0.8}
        >
          <View className="flex-row items-center gap-4 rounded-full bg-interactive-2 px-8 py-5">
            <CalendarPlus size={28} color="#5A32FB" />
            <Text className="text-xl font-bold text-interactive-1">Add</Text>
          </View>
        </TouchableOpacity>

        {showSaveButton && (
          <TouchableOpacity
            onPress={handleFollow}
            accessibilityLabel="Save Event"
            accessibilityRole="button"
            activeOpacity={0.8}
          >
            <View className="flex-row items-center gap-4 rounded-full bg-interactive-1 px-8 py-5">
              <Heart size={28} color="#FFFFFF" />
              <Text className="text-xl font-bold text-white">Save</Text>
            </View>
          </TouchableOpacity>
        )}

        {showShareButton && (
          <TouchableOpacity
            onPress={handleShare}
            accessibilityLabel="Share"
            accessibilityRole="button"
            activeOpacity={0.8}
          >
            <View className="flex-row items-center gap-4 rounded-full bg-interactive-1 px-8 py-5">
              <ShareIcon size={28} color="#FFFFFF" />
              <Text className="text-xl font-bold text-white">Share</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </>
  );
}
