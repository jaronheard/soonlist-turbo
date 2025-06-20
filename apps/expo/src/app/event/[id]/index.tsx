import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  Pressable,
  Image as RNImage,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { Link, router, Stack, useLocalSearchParams } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { useQuery } from "convex/react";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";
import { api } from "@soonlist/backend/convex/_generated/api";

import { EventMenu } from "~/components/EventMenu";
import { EyeOff, Globe2, MapPin, User } from "~/components/icons";
import LoadingSpinner from "~/components/LoadingSpinner";
import ShareButton from "~/components/ShareButton";
import { UserProfileFlair } from "~/components/UserProfileFlair";
import { useEventActions } from "~/hooks/useEventActions";
import { formatEventDateRange } from "~/utils/dates";
import { logError } from "../../../utils/errorLogging";

export default function Page() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = Dimensions.get("window");
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useUser();

  // Store the aspect ratio for the main event image
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  // Track whether the image is fully loaded (for a fade-in)
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const event = useQuery(api.events.get, { eventId: id });

  const isSaved =
    event && currentUser ? event.userId !== currentUser.id : false;

  const { handleDelete } = useEventActions({
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
        <ShareButton webPath={`/event/${id}`} />
      </View>
    );
  }, [event, isSaved, currentUser?.id, id, handleDeleteAndRedirect]);

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

  return (
    <>
      <Stack.Screen options={{ headerRight: HeaderRight }} />
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
                    <MapPin size={16} color="#6b7280" />
                    <Text className="ml-1 text-neutral-2">
                      {eventData.location}
                    </Text>
                  </View>
                </Pressable>
              </Link>
            )}

            {/* Visibility or user info */}
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
                  @{event.user?.username || "unknown"}
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          <View className="my-8">
            <Text className="text-neutral-1">{eventData.description}</Text>
          </View>

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
    </>
  );
}
