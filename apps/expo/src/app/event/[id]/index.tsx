import React, { useCallback, useState } from "react";
import {
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Link, router, Stack, useLocalSearchParams } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { Temporal } from "@js-temporal/polyfill";
import { EyeOff, Globe2, MapPin, User } from "lucide-react-native";

import type { AddToCalendarButtonPropsRestricted } from "@soonlist/cal/types";

import type { RouterOutputs } from "~/utils/api";
import { EventMenu } from "~/components/EventMenu";
import LoadingSpinner from "~/components/LoadingSpinner";
import ShareButton from "~/components/ShareButton";
import { UserProfileFlair } from "~/components/UserProfileFlair";
import { api } from "~/utils/api";
import { getDateTimeInfo, timeFormatDateInfo } from "~/utils/dates";

export default function Page() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const utils = api.useUtils();
  const { width } = Dimensions.get("window");
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useUser();

  const [refreshing, setRefreshing] = useState(false);
  const [imageHeight, setImageHeight] = useState(0);

  const username = currentUser?.username || "";
  const eventQuery = api.event.get.useQuery({ eventId: id });
  const savedIdsQuery = api.event.getSavedIdsForUser.useQuery({
    userName: username,
  });

  const deleteEventMutation = api.event.delete.useMutation({
    onSuccess: () => {
      void utils.event.invalidate();
      router.replace("/");
    },
  });

  const handleDelete = useCallback(async () => {
    if (id && typeof id === "string") {
      await deleteEventMutation.mutateAsync({ id });
    }
  }, [deleteEventMutation, id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void eventQuery.refetch().then(() => setRefreshing(false));
  }, [eventQuery]);

  const HeaderRight = useCallback(() => {
    if (!eventQuery.data) return null;
    return (
      <View className="flex-row items-center gap-2">
        <EventMenu
          event={
            eventQuery.data as RouterOutputs["event"]["getUpcomingForUser"][number]
          }
          isOwner={eventQuery.data.userId === currentUser?.id}
          isSaved={
            savedIdsQuery.data?.some(
              (savedEvent) => savedEvent.id === eventQuery.data?.id,
            ) ?? false
          }
          menuType="popup"
          onDelete={handleDelete}
        />
        <ShareButton webPath={`/event/${id}`} />
      </View>
    );
  }, [eventQuery.data, savedIdsQuery.data, currentUser?.id, id, handleDelete]);

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

  const event = eventQuery.data;
  const eventData = event.event as AddToCalendarButtonPropsRestricted;
  const isCurrentUserEvent = currentUser?.id === event.userId;

  const formatDate = (date: string, startTime?: string, endTime?: string) => {
    // Convert from event timezone to local time
    const localTimezone = Temporal.Now.timeZoneId();
    const eventTimezone = eventData.timeZone || localTimezone;
    const startDateInfo = getDateTimeInfo(date, startTime || "");
    if (!startDateInfo) return { date: "", time: "" };

    // If we have a valid event timezone, convert the time
    if (eventTimezone && eventTimezone !== "unknown") {
      try {
        const zonedDateTime = Temporal.ZonedDateTime.from(
          `${date}T${startTime || "00:00:00"}[${eventTimezone}]`,
        );
        const localDateTime = zonedDateTime.withTimeZone(localTimezone);
        startDateInfo.hour = localDateTime.hour;
        startDateInfo.minute = localDateTime.minute;
      } catch (error) {
        console.error("Error converting timezone:", error);
      }
    }

    const formattedDate = `${startDateInfo.dayOfWeek}, ${startDateInfo.monthName} ${startDateInfo.day}`;
    const formattedStartTime = startTime
      ? timeFormatDateInfo(startDateInfo)
      : "";

    let formattedEndTime = "";
    if (endTime) {
      const endDateInfo = getDateTimeInfo(date, endTime);
      if (endDateInfo && eventTimezone && eventTimezone !== "unknown") {
        try {
          const zonedDateTime = Temporal.ZonedDateTime.from(
            `${date}T${endTime}[${eventTimezone}]`,
          );
          const localDateTime = zonedDateTime.withTimeZone(localTimezone);
          endDateInfo.hour = localDateTime.hour;
          endDateInfo.minute = localDateTime.minute;
        } catch (error) {
          console.error("Error converting timezone:", error);
        }
      }
      formattedEndTime = endDateInfo ? timeFormatDateInfo(endDateInfo) : "";
    }

    const timeRange =
      startTime && endTime
        ? `${formattedStartTime} - ${formattedEndTime}`
        : formattedStartTime;
    return { date: formattedDate, time: timeRange.trim() };
  };

  const { date, time } = formatDate(
    eventData.startDate || "",
    eventData.startTime,
    eventData.endTime,
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: HeaderRight,
        }}
      />
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
            {eventData.location && (
              <Link
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventData.location)}`}
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
                    <Image
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
          <View className="my-8">
            <Text className="text-neutral-1">{eventData.description}</Text>
          </View>
          {eventData.images?.[3] && (
            <View className="mb-4">
              <Image
                source={{
                  uri: `${eventData.images[3]}?max-w=1284&fit=cover&f=webp&q=80`,
                }}
                style={{ width: width - 32, height: imageHeight || width - 32 }}
                contentFit="contain"
                contentPosition="center"
                transition={200}
                cachePolicy="memory-disk"
                className="bg-muted/10"
                onLoad={(e) => {
                  const { width: naturalWidth, height: naturalHeight } =
                    e.source;
                  const aspectRatio = naturalHeight / naturalWidth;
                  setImageHeight((width - 32) * aspectRatio);
                }}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}
