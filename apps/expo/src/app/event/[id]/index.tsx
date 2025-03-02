import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  Pressable,
  RefreshControl,
  Image as RNImage,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import { Link, router, Stack, useLocalSearchParams } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { EyeOff, Globe2, MapPin, User } from "lucide-react-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import { EventMenu } from "~/components/EventMenu";
import LoadingSpinner from "~/components/LoadingSpinner";
import ShareButton from "~/components/ShareButton";
import { UserProfileFlair } from "~/components/UserProfileFlair";
import { api } from "~/utils/api";
import { formatEventDateRange } from "~/utils/dates";

export default function Page() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = Dimensions.get("window");
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useUser();

  const [refreshing, setRefreshing] = useState(false);
  // Store the aspect ratio for the main event image
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  // Track whether the image is fully loaded (for a fade-in)
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const username = currentUser?.username || "";

  // Get the utils at the top level of the component
  const utils = api.useUtils();

  // Load the event data
  const eventQuery = api.event.get.useQuery(
    { eventId: id || "" },
    {
      // Only run this query if 'id' is defined
      enabled: Boolean(id),
    },
  );
  // Check saved events
  const savedIdsQuery = api.event.getSavedIdsForUser.useQuery({
    userName: username,
  });

  // Mutations
  const deleteEventMutation = api.event.delete.useMutation({
    onSuccess: () => {
      // Use the utils reference from above instead of calling useUtils() here
      void utils.event.invalidate();
      router.replace("/");
    },
  });

  // Handlers
  const handleDelete = useCallback(async () => {
    if (id && typeof id === "string") {
      await deleteEventMutation.mutateAsync({ id });
    }
  }, [deleteEventMutation, id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void eventQuery.refetch().then(() => setRefreshing(false));
  }, [eventQuery]);

  // Pre-calculate the aspect ratio of the event image, if it exists
  useEffect(() => {
    const eventData = eventQuery.data?.event as
      | AddToCalendarButtonPropsRestricted
      | undefined;
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
        console.error("Failed to get image size:", err);
      },
    );
  }, [eventQuery.data?.event]);

  // Build the header-right UI if we have data
  const HeaderRight = useCallback(() => {
    const data = eventQuery.data;
    if (!data) return null;
    const isSaved = savedIdsQuery.data?.some(
      (savedEvent) => savedEvent.id === data.id,
    );
    return (
      <View className="flex-row items-center gap-2">
        <EventMenu
          event={data as RouterOutputs["event"]["getUpcomingForUser"][number]}
          isOwner={data.userId === currentUser?.id}
          isSaved={Boolean(isSaved)}
          menuType="popup"
          onDelete={handleDelete}
        />
        <ShareButton webPath={`/event/${id}`} />
      </View>
    );
  }, [eventQuery.data, savedIdsQuery.data, currentUser?.id, id, handleDelete]);

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
  if (eventQuery.isLoading) {
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
  if (!eventQuery.data) {
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
  const event = eventQuery.data;
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
                <UserProfileFlair username={event.user.username} size="xs">
                  {event.user.userImage ? (
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
                  @{event.user.username}
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
